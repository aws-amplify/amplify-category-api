import { ConversationDirective } from '@aws-amplify/graphql-directives';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import {
  DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  DirectiveWrapper,
  InvalidDirectiveError,
  InvalidTransformerError,
  TransformerPluginBase,
  generateGetArgumentsInput,
  TransformerResolver,
  getModelDataSourceNameForTypeName,
  getTable,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerAuthProvider,
  TransformerContextProvider,
  TransformerPreProcessContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  DirectiveNode,
  DocumentNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  NamedTypeNode,
  ObjectTypeDefinitionNode
} from 'graphql';
import {
  FunctionResourceIDs,
  makeArgument,
  makeDirective,
  makeField,
  makeInputValueDefinition,
  makeListType,
  makeNamedType,
  makeNonNullType,
  makeValueNode,
  ResolverResourceIDs,
  ResourceConstants,
} from 'graphql-transformer-common';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { Effect } from 'aws-cdk-lib/aws-iam';
import { overrideIndexAtCfnLevel } from '@aws-amplify/graphql-index-transformer';
import { assistantMutationResolver } from './resolvers/assistant-mutation-resolver';
import { authMappingTemplate } from './resolvers/auth-resolver';
import { initMappingTemplate } from './resolvers/init-resolver';
import { invokeLambdaMappingTemplate } from './resolvers/invoke-lambda-resolver';
import { readHistoryMappingTemplate } from './resolvers/message-history-resolver';
import { verifySessionOwnerMappingTemplate } from './resolvers/verify-session-owner-resolver';
import { writeMessageToTableMappingTemplate } from './resolvers/write-message-to-table-resolver';
import { getBedrockModelId } from './utils/bedrock-model-id';
import { conversationMessageSubscriptionMappingTamplate } from './resolvers/assistant-messages-subscription-resolver';
import { createConversationModel, ConversationModel } from './graphql-types/session-model';
import { createMessageModel, MessageModel } from './graphql-types/message-model';
import { ConversationHandler } from '@aws-amplify/backend-ai'; // /lib/conversation/conversation_handler_construct';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { type ToolDefinition, type Tools, processTools } from './utils/tools';

export type ConversationDirectiveConfiguration = {
  parent: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  aiModel: string;
  functionName: string | undefined;
  field: FieldDefinitionNode;
  responseMutationInputTypeName: string;
  responseMutationName: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  toolSpec: Tools;
  conversationModel: ConversationModel;
  messageModel: MessageModel;
};

export class ConversationTransformer extends TransformerPluginBase {
  private directives: ConversationDirectiveConfiguration[] = [];
  private modelTransformer: ModelTransformer;
  private hasManyTransformer: HasManyTransformer;
  private belongsToTransformer: BelongsToTransformer;
  private authProvider: TransformerAuthProvider;

  constructor(
    modelTransformer: ModelTransformer,
    hasManyTransformer: HasManyTransformer,
    belongsToTransformer: BelongsToTransformer,
    authProvider: TransformerAuthProvider,
  ) {
    super('amplify-conversation-transformer', ConversationDirective.definition);
    this.modelTransformer = modelTransformer;
    this.hasManyTransformer = hasManyTransformer;
    this.belongsToTransformer = belongsToTransformer;
    this.authProvider = authProvider;
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    if (parent.name.value !== 'Mutation') {
      throw new InvalidDirectiveError('@conversation directive must be used on Mutation field.');
    }

    const directiveWrapped = new DirectiveWrapper(directive);
    const config = directiveWrapped.getArguments(
      {
        parent,
        directive,
        field: definition,
      } as ConversationDirectiveConfiguration,
      generateGetArgumentsInput(context.transformParameters),
    );

    const capitalizedFieldName = capitalizeFirstLetter(config.field.name.value);
    const conversationModelName = `Conversation${capitalizedFieldName}`;
    const messageModelName = `ConversationMessage${capitalizedFieldName}`;
    const referenceFieldName = 'conversationId';
    if (definition.type.kind !== 'NamedType' || definition.type.name.value !== 'ConversationMessage') {
      throw new InvalidDirectiveError('@conversation return type must be ConversationMessage');
    }
    config.messageModel = createMessageModel(messageModelName, conversationModelName, referenceFieldName, definition.type);
    config.conversationModel = createConversationModel(conversationModelName, messageModelName, referenceFieldName);

    validate(config, context as TransformerContextProvider);
    this.directives.push(config);
  };

  mutateSchema = (ctx: TransformerPreProcessContextProvider): DocumentNode => {
    const mutationObjectContainingConversationDirectives = ctx.inputDocument.definitions.filter(
      (definition) =>
        definition.kind === 'ObjectTypeDefinition' &&
        definition.name.value === 'Mutation' &&
        definition.fields?.filter((mutationFields) =>
          mutationFields.directives?.filter((directive) => directive.name.value === ConversationDirective.name),
        ),
    ) as ObjectTypeDefinitionNode[];

    // TODO: add validation for expected fields
    const conversationMessageInterface = ctx.inputDocument.definitions.find(
      (definition) => definition.kind === 'InterfaceTypeDefinition' && definition.name.value === 'ConversationMessage',
    ) as InterfaceTypeDefinitionNode;

    const named: NamedTypeNode = {
      kind: 'NamedType',
      name: { value: 'ConversationMessage', kind: 'Name' },
    };

    const conversationDirectiveFields = mutationObjectContainingConversationDirectives[0].fields;

    if (!conversationDirectiveFields) {
      throw new Error('No conversation directives found despite expecting them in mutateSchema of conversation-transformer');
    }
    const document: DocumentNode = produce(ctx.inputDocument, (draft: WritableDraft<DocumentNode>) => {
      for (const conversationDirectiveField of conversationDirectiveFields) {
        const fieldName = capitalizeFirstLetter(conversationDirectiveField.name.value);
        const conversationModelName = `Conversation${fieldName}`;
        const messageModelName = `ConversationMessage${fieldName}`;
        const referenceFieldName = 'conversationId';

        const { conversationModel } = createConversationModel(conversationModelName, messageModelName, referenceFieldName);
        const { messageModel } = createMessageModel(messageModelName, conversationModelName, referenceFieldName, named);

        draft.definitions.push(conversationModel as WritableDraft<ObjectTypeDefinitionNode>);
        draft.definitions.push(messageModel as WritableDraft<ObjectTypeDefinitionNode>);
      }
    });
    return document;
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    for (const directive of this.directives) {
      const tools = processTools(directive.tools, ctx);
      if (tools) {
        directive.toolSpec = tools;
      }
      const { parent, field } = directive;
      const parentName = parent.name.value;
      const capitalizedFieldName = capitalizeFirstLetter(field.name.value);
      const fieldName = field.name.value;
      const resolverResourceId = ResolverResourceIDs.ResolverResourceID(parentName, fieldName);

      const bedrockModelId = getBedrockModelId(directive.aiModel);

      // TODO: Support single function for multiple routes.
      // TODO: Do we really need to create a nested stack here?
      const functionStack = ctx.stackManager.createStack(`${capitalizedFieldName}ConversationDirectiveLambdaStack`);
      let functionDataSourceId: string;
      let referencedFunction: IFunction;
      if (directive.functionName) {
        functionDataSourceId = FunctionResourceIDs.FunctionDataSourceID(directive.functionName!);
        referencedFunction = lambda.Function.fromFunctionAttributes(functionStack, `${functionDataSourceId}Function`, {
          functionArn: lambdaArnResource(directive.functionName!),
        });

        // -------------------------------------------------------------------------------------------------------------------------------
        // TODO: This should probs be deleted. Adding the policy to the IFunction we have here doesn't work
        const invokeModelPolicyStatement = new cdk.aws_iam.PolicyStatement({
          actions: ['bedrock:InvokeModel'],
          effect: Effect.ALLOW,
          resources: [`arn:aws:bedrock:\${AWS::Region}::foundation-model/${bedrockModelId}`],
        });

        referencedFunction.role?.attachInlinePolicy(
          new cdk.aws_iam.Policy(functionStack, 'ConversationRouteLambdaRolePolicyBedrockConverse', {
            statements: [invokeModelPolicyStatement],
            policyName: 'ConversationRouteLambdaRolePolicyBedrockConverse',
          }),
        );
      } else {
        const defaultConversationHandler = new ConversationHandler(functionStack, `${capitalizedFieldName}DefaultConversationHandler`, {
          // TODO: Pull from directive config
          allowedModels: [
            {
              modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
              region: 'us-west-2',
            },
          ],
        });
        functionDataSourceId = FunctionResourceIDs.FunctionDataSourceID(`${capitalizedFieldName}DefaultConversationHandler`);
        referencedFunction = defaultConversationHandler.resources.lambda;
      }
      // -------------------------------------------------------------------------------------------------------------------------------

      const assistantResponseResolverResourceId = ResolverResourceIDs.ResolverResourceID('Mutation', directive.responseMutationName);
      const assistantResponseResolverFunction = assistantMutationResolver();
      const conversationMessageDataSourceName = getModelDataSourceNameForTypeName(ctx, `ConversationMessage${capitalizedFieldName}`);
      const conversationMessageDataSource = ctx.api.host.getDataSource(conversationMessageDataSourceName);
      const assistantResponseResolver = new TransformerResolver(
        'Mutation',
        directive.responseMutationName,
        assistantResponseResolverResourceId,
        assistantResponseResolverFunction.req,
        assistantResponseResolverFunction.res,
        [],
        [],
        conversationMessageDataSource as any,
        { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' },
      );

      ctx.resolvers.addResolver('Mutation', directive.responseMutationName, assistantResponseResolver);

      // ---- assitant response subscription resolver -----
      const onAssistantResponseSubscriptionFieldName = `onCreateAssistantResponse${capitalizedFieldName}`;
      const onAssistantResponseSubscriptionResolverResourceId = ResolverResourceIDs.ResolverResourceID(
        'Subscription',
        onAssistantResponseSubscriptionFieldName,
      );
      const onAssistantResponseSubscriptionResolverFunction = conversationMessageSubscriptionMappingTamplate();
      const onAssistantResponseSubscriptionResolver = new TransformerResolver(
        'Subscription',
        onAssistantResponseSubscriptionFieldName,
        onAssistantResponseSubscriptionResolverResourceId,
        onAssistantResponseSubscriptionResolverFunction.req,
        onAssistantResponseSubscriptionResolverFunction.res,
        [],
        [],
        undefined,
        { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' },
      );
      ctx.resolvers.addResolver('Subscription', onAssistantResponseSubscriptionFieldName, onAssistantResponseSubscriptionResolver);
      // ------ assitant response subscription resolver -----

      const functionDataSourceScope = ctx.stackManager.getScopeFor(
        functionDataSourceId,
        `${capitalizedFieldName}ConversationDirectiveLambdaStack`,
      );
      const functionDataSource = ctx.api.host.addLambdaDataSource(functionDataSourceId, referencedFunction, {}, functionDataSourceScope);
      const invokeLambdaFunction = invokeLambdaMappingTemplate(directive, ctx);

      const messageModelName = directive.messageModel.messageModel.name.value;
      const conversationModelName = directive.conversationModel.conversationModel.name.value;
      const referenceFieldName = 'conversationId';
      const messageModel = directive.messageModel.messageModel;

      const conversationMessagesTable = getTable(ctx, messageModel);
      const gsiPartitionKeyName = referenceFieldName;
      const gsiPartitionKeyType = 'S';
      const gsiSortKeyName = 'createdAt';
      const gsiSortKeyType = 'S';
      const indexName = 'gsi-ConversationMessage.conversationId.createdAt';
      addGlobalSecondaryIndex(
        conversationMessagesTable,
        indexName,
        { name: gsiPartitionKeyName, type: gsiPartitionKeyType },
        { name: gsiSortKeyName, type: gsiSortKeyType },
        ctx,
        messageModelName,
      );

      // pipeline resolver
      const conversationPipelineResolver = new TransformerResolver(
        parentName,
        fieldName,
        resolverResourceId,
        invokeLambdaFunction.req,
        invokeLambdaFunction.res,
        ['init', 'auth', 'verifySessionOwner', 'writeMessageToTable', 'retrieveMessageHistory'],
        ['handleLambdaResponse', 'finish'],
        functionDataSource,
        { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' },
      );

      // init
      const initFunction = initMappingTemplate();
      conversationPipelineResolver.addToSlot('init', initFunction.req, initFunction.res);

      // auth
      const authFunction = authMappingTemplate();
      conversationPipelineResolver.addToSlot('auth', authFunction.req, authFunction.res);

      const sessionModelDDBDataSourceName = getModelDataSourceNameForTypeName(ctx, conversationModelName);
      const conversationSessionDDBDataSource = ctx.api.host.getDataSource(sessionModelDDBDataSourceName);

      // verifySessionOwner
      const verifySessionOwnerFunction = verifySessionOwnerMappingTemplate();
      conversationPipelineResolver.addToSlot(
        'verifySessionOwner',
        verifySessionOwnerFunction.req,
        verifySessionOwnerFunction.res,
        conversationSessionDDBDataSource as any,
      );

      // writeMessageToTable
      const messageModelDDBDataSourceName = getModelDataSourceNameForTypeName(ctx, messageModelName);
      const messageDDBDataSource = ctx.api.host.getDataSource(messageModelDDBDataSourceName);
      const writeMessageToTableFunction = writeMessageToTableMappingTemplate(capitalizedFieldName);
      conversationPipelineResolver.addToSlot(
        'writeMessageToTable',
        writeMessageToTableFunction.req,
        writeMessageToTableFunction.res,
        messageDDBDataSource as any,
      );

      // retrieveMessageHistory
      const retrieveMessageHistoryFunction = readHistoryMappingTemplate(capitalizedFieldName);
      conversationPipelineResolver.addToSlot(
        'retrieveMessageHistory',
        retrieveMessageHistoryFunction.req,
        retrieveMessageHistoryFunction.res,
        messageDDBDataSource as any,
      );

      ctx.resolvers.addResolver(parentName, fieldName, conversationPipelineResolver);
    }
  };

  prepare = (ctx: TransformerPrepareStepContextProvider): void => {
    for (const directive of this.directives) {
      // TODO: Add @aws_cognito_user_pools directive to
      // send messages mutation.
      const fieldName = capitalizeFirstLetter(directive.field.name.value);
      const sessionModelName = directive.conversationModel.conversationModel.name.value;
      const messageModelName = directive.messageModel.messageModel.name.value;

      const {
        conversationAuthDirective,
        conversationModelDirective,
        conversationHasManyMessagesDirective,
        conversationMessagesField,
        conversationModel,
      } = directive.conversationModel;

      const { messageAuthDirective, messageModelDirective, messageBelongsToConversationDirective, messageConversationField, messageModel } =
        directive.messageModel;

      // Assistant mutation - Input
      const assistantMutationInput = makeAssistantResponseMutationInput(messageModelName);
      // Assistant mutation
      const assistantMutationName = `createAssistantResponse${fieldName}`;
      const assistantMutation = makeAssistantResponseMutation(assistantMutationName, assistantMutationInput.name.value, messageModelName);
      ctx.output.addInput(assistantMutationInput);
      ctx.output.addMutationFields([assistantMutation]);
      directive.responseMutationInputTypeName = assistantMutationInput.name.value;
      directive.responseMutationName = assistantMutationName;

      // -----

      // Subscription on assistant response mutation
      const onAssistantResponseMutation = makeConversationMessageSubscription(
        `onCreateAssistantResponse${fieldName}`,
        messageModelName,
        assistantMutationName,
      );
      ctx.output.addSubscriptionFields([onAssistantResponseMutation]);
      // -----

      ctx.output.addObject(conversationModel);
      ctx.output.addObject(messageModel);

      ctx.providerRegistry.registerDataSourceProvider(conversationModel, this.modelTransformer);
      ctx.providerRegistry.registerDataSourceProvider(messageModel, this.modelTransformer);

      ctx.dataSourceStrategies[sessionModelName] = DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY;
      ctx.dataSourceStrategies[messageModelName] = DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY;

      this.modelTransformer.object(conversationModel, conversationModelDirective, ctx);
      this.modelTransformer.object(messageModel, messageModelDirective, ctx);

      this.belongsToTransformer.field(messageModel, messageConversationField, messageBelongsToConversationDirective, ctx);
      this.hasManyTransformer.field(conversationModel, conversationMessagesField, conversationHasManyMessagesDirective, ctx);

      if (!this.authProvider.object) {
        // TODO: error message
        throw new InvalidTransformerError('No auth provider found -- uh oh');
      }
      this.authProvider.object(conversationModel, conversationAuthDirective, ctx);
      this.authProvider.object(messageModel, messageAuthDirective, ctx);
    }
  };
}

const validate = (config: ConversationDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  // TODO: validation logic
};

// #region AssistantResponse Mutation
const makeAssistantResponseMutationInput = (messageModelName: string): InputObjectTypeDefinitionNode => {
  const inputName = `Create${messageModelName}AssistantInput`;
  return {
    kind: 'InputObjectTypeDefinition',
    name: { kind: 'Name', value: inputName },
    fields: [
      makeInputValueDefinition('conversationId', makeNamedType('ID')),
      makeInputValueDefinition('content', makeListType(makeNamedType('ContentBlockInput'))),
      makeInputValueDefinition('associatedUserMessageId', makeNamedType('ID')),
    ],
  };
};

const makeAssistantResponseMutation = (fieldName: string, inputTypeName: string, messageModelName: string): FieldDefinitionNode => {
  const args = [makeInputValueDefinition('input', makeNonNullType(makeNamedType(inputTypeName)))];
  const cognitoAuthDirective = makeDirective('aws_cognito_user_pools', []);
  const createAssistantResponseMutation = makeField(fieldName, args, makeNamedType(messageModelName), [cognitoAuthDirective]);
  return createAssistantResponseMutation;
};

type KeyAttributeDefinition = {
  name: string;
  type: 'S' | 'N';
};

const addGlobalSecondaryIndex = (
  table: any,
  indexName: string,
  partitionKey: KeyAttributeDefinition,
  sortKey: KeyAttributeDefinition,
  ctx: TransformerContextProvider,
  typeName: string,
): void => {
  table.addGlobalSecondaryIndex({
    indexName,
    // TODO: update to only project keys that we need when retrieving history
    projectionType: 'ALL',
    partitionKey,
    sortKey,
    readCapacity: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
    writeCapacity: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
  });

  const gsi = table.globalSecondaryIndexes.find((g: any) => g.indexName === indexName);

  const newIndex = {
    indexName,
    keySchema: gsi.keySchema,
    projection: { projectionType: 'ALL' },
    provisionedThroughput: cdk.Fn.conditionIf(ResourceConstants.CONDITIONS.ShouldUsePayPerRequestBilling, cdk.Fn.ref('AWS::NoValue'), {
      ReadCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableReadIOPS),
      WriteCapacityUnits: cdk.Fn.ref(ResourceConstants.PARAMETERS.DynamoDBModelTableWriteIOPS),
    }),
  };

  overrideIndexAtCfnLevel(ctx, typeName, table, newIndex);
};

// #region Subscription
const makeConversationMessageSubscription = (
  subscriptionName: string,
  conversationMessageTypeName: string,
  onMutationName: string,
): FieldDefinitionNode => {
  const awsSubscribeDirective = makeDirective('aws_subscribe', [makeArgument('mutations', makeValueNode([onMutationName]))]);
  const cognitoAuthDirective = makeDirective('aws_cognito_user_pools', []);

  const args: InputValueDefinitionNode[] = [makeInputValueDefinition('conversationId', makeNamedType('ID'))];
  const subscriptionField = makeField(subscriptionName, args, makeNamedType(conversationMessageTypeName), [
    awsSubscribeDirective,
    cognitoAuthDirective,
  ]);

  return subscriptionField;
};

const lambdaArnResource = (name: string): string => {
  // eslint-disable-next-line no-template-curly-in-string
  return cdk.Fn.sub('arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${name}', { name });
};

const lambdaArnKey = (name: string, region?: string, accountId?: string): string => {
  // eslint-disable-next-line no-template-curly-in-string
  return `arn:aws:lambda:${region ? region : '${AWS::Region}'}:${accountId ? accountId : '${AWS::AccountId}'}:function:${name}`;
};

// #endregion Resolvers

const capitalizeFirstLetter = (value: string): string => {
  return value.charAt(0).toUpperCase() + value.slice(1);
};
