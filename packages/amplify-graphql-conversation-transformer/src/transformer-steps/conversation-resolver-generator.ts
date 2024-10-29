import { MappingTemplateProvider, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';
import { processTools } from '../utils/tools';
import { APPSYNC_JS_RUNTIME, TransformerResolver } from '@aws-amplify/graphql-transformer-core';
import { ResolverResourceIDs, FunctionResourceIDs, ResourceConstants, toUpper } from 'graphql-transformer-common';
import * as cdk from 'aws-cdk-lib';
import { conversation } from '@aws-amplify/ai-constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { getModelDataSourceNameForTypeName, getTable } from '@aws-amplify/graphql-transformer-core';
import { initMappingTemplate } from '../resolvers/init-resolver';
import { authMappingTemplate } from '../resolvers/auth-resolver';
import {
  verifySessionOwnerSendMessageMappingTemplate,
  verifySessionOwnerAssistantResponseMappingTemplate,
} from '../resolvers/verify-session-owner-resolver';
import { writeMessageToTableMappingTemplate } from '../resolvers/write-message-to-table-resolver';
import { invokeLambdaMappingTemplate } from '../resolvers/invoke-lambda-resolver';
import { assistantMutationResolver } from '../resolvers/assistant-mutation-resolver';
import { conversationMessageSubscriptionMappingTamplate } from '../resolvers/assistant-messages-subscription-resolver';
import { overrideIndexAtCfnLevel } from '@aws-amplify/graphql-index-transformer';
import pluralize from 'pluralize';
import { listMessageInitMappingTemplate } from '../resolvers/list-messages-init-resolver';

type KeyAttributeDefinition = {
  name: string;
  type: 'S' | 'N';
};

// TODO: add explanation for the tool model queries
export class ConversationResolverGenerator {
  constructor(private readonly functionNameMap?: Record<string, IFunction>) {}

  generateResolvers(directives: ConversationDirectiveConfiguration[], ctx: TransformerContextProvider): void {
    for (const directive of directives) {
      this.processToolsForDirective(directive, ctx);
      this.generateResolversForDirective(directive, ctx);
      this.addInitSlotToListMessagesPipeline(ctx, directive);
    }
  }

  private processToolsForDirective(directive: ConversationDirectiveConfiguration, ctx: TransformerContextProvider): void {
    const tools = processTools(directive.tools, ctx);
    if (tools) {
      directive.toolSpec = tools;
    }
  }

  private generateResolversForDirective(directive: ConversationDirectiveConfiguration, ctx: TransformerContextProvider): void {
    const { parent, field } = directive;
    const parentName = parent.name.value;
    const capitalizedFieldName = toUpper(field.name.value);
    const fieldName = field.name.value;

    const functionStack = this.createFunctionStack(ctx, capitalizedFieldName);
    const { functionDataSourceId, referencedFunction } = this.setupFunctionDataSource(directive, functionStack, capitalizedFieldName);
    const functionDataSource = this.addLambdaDataSource(ctx, functionDataSourceId, referencedFunction, capitalizedFieldName);
    const invokeLambdaFunction = invokeLambdaMappingTemplate(directive);

    this.setupMessageTableIndex(ctx, directive);
    const initResolverFunction = initMappingTemplate(ctx);
    const authResolverFunction = authMappingTemplate(directive);
    const verifySessionOwnerSendMessageResolverFunction = verifySessionOwnerSendMessageMappingTemplate(directive);
    const verifySessionOwnerAssistantResponseResolverFunction = verifySessionOwnerAssistantResponseMappingTemplate(directive);
    const writeMessageToTableFunction = writeMessageToTableMappingTemplate(directive);

    this.createConversationPipelineResolver(
      ctx,
      parentName,
      fieldName,
      capitalizedFieldName,
      functionDataSource,
      invokeLambdaFunction,
      initResolverFunction,
      authResolverFunction,
      verifySessionOwnerSendMessageResolverFunction,
      writeMessageToTableFunction,
    );

    this.createAssistantResponseResolver(
      ctx,
      directive,
      capitalizedFieldName,
      initResolverFunction,
      authResolverFunction,
      verifySessionOwnerAssistantResponseResolverFunction,
    );
    this.createAssistantResponseSubscriptionResolver(ctx, directive, capitalizedFieldName);
  }

  /**
   * Creates a function stack for the conversation directive
   * @param ctx - The transformer context provider
   * @param capitalizedFieldName - The capitalized field name
   * @returns The created stack
   */
  private createFunctionStack(ctx: TransformerContextProvider, capitalizedFieldName: string): cdk.Stack {
    return ctx.stackManager.createStack(`${capitalizedFieldName}ConversationDirectiveLambdaStack`);
  }

  /**
   * Sets up the function data source
   * @param directive - The conversation directive configuration
   * @param functionStack - The function stack
   * @param capitalizedFieldName - The capitalized field name
   * @returns The function data source ID and referenced function
   */
  private setupFunctionDataSource(
    directive: ConversationDirectiveConfiguration,
    functionStack: cdk.Stack,
    capitalizedFieldName: string,
  ): { functionDataSourceId: string; referencedFunction: IFunction } {
    if (directive.functionName) {
      return this.setupExistingFunctionDataSource(directive.functionName);
    } else {
      return this.setupDefaultConversationHandler(functionStack, capitalizedFieldName, directive.aiModel);
    }
  }

  /**
   * Sets up a data source for an existing Lambda function
   * @param functionName - The name of the existing Lambda function
   * @param functionStack - The CDK stack to add the function to
   * @returns An object containing the function data source ID and the referenced function
   */
  private setupExistingFunctionDataSource(functionName: string): { functionDataSourceId: string; referencedFunction: IFunction } {
    const functionDataSourceId = FunctionResourceIDs.FunctionDataSourceID(functionName);
    if (!this.functionNameMap) {
      throw new Error('Function name map is not provided');
    }
    const referencedFunction = this.functionNameMap[functionName];
    if (!referencedFunction) {
      throw new Error(`Function ${functionName} not found in function name map`);
    }
    return { functionDataSourceId, referencedFunction };
  }

  /**
   * Sets up a default conversation handler function
   * @param functionStack - The CDK stack to add the function to
   * @param capitalizedFieldName - The capitalized field name
   * @param aiModel - The AI model to use for the conversation
   * @returns An object containing the function data source ID and the created function
   */
  private setupDefaultConversationHandler(
    functionStack: cdk.Stack,
    capitalizedFieldName: string,
    aiModel: string,
  ): { functionDataSourceId: string; referencedFunction: IFunction } {
    const defaultConversationHandler = new conversation.ConversationHandlerFunction(
      functionStack,
      `${capitalizedFieldName}DefaultConversationHandler`,
      {
        models: [
          {
            modelId: aiModel,
          },
        ],
      },
    );

    const functionDataSourceId = FunctionResourceIDs.FunctionDataSourceID(`${capitalizedFieldName}DefaultConversationHandler`);
    const referencedFunction = defaultConversationHandler.resources.lambda;

    return { functionDataSourceId, referencedFunction };
  }

  /**
   * Creates the conversation pipeline resolver
   * @param ctx - The transformer context provider
   * @param parentName - The parent name
   * @param fieldName - The field name
   * @param capitalizedFieldName - The capitalized field name
   * @param functionDataSource - The function data source
   * @param invokeLambdaFunction - The invoke lambda function
   */
  private createConversationPipelineResolver(
    ctx: TransformerContextProvider,
    parentName: string,
    fieldName: string,
    capitalizedFieldName: string,
    functionDataSource: any,
    invokeLambdaFunction: MappingTemplateProvider,
    initResolverFunction: MappingTemplateProvider,
    authResolverFunction: MappingTemplateProvider,
    verifySessionOwnerResolverFunction: MappingTemplateProvider,
    writeMessageToTableFunction: MappingTemplateProvider,
  ): void {
    const resolverResourceId = ResolverResourceIDs.ResolverResourceID(parentName, fieldName);
    const runtime = APPSYNC_JS_RUNTIME;
    const conversationPipelineResolver = new TransformerResolver(
      parentName,
      fieldName,
      resolverResourceId,
      { codeMappingTemplate: invokeLambdaFunction },
      ['init', 'auth', 'verifySessionOwner', 'writeMessageToTable'],
      ['handleLambdaResponse', 'finish'],
      functionDataSource,
      runtime,
    );

    this.addPipelineResolverFunctions(
      ctx,
      conversationPipelineResolver,
      capitalizedFieldName,
      initResolverFunction,
      authResolverFunction,
      verifySessionOwnerResolverFunction,
      writeMessageToTableFunction,
    );

    ctx.resolvers.addResolver(parentName, fieldName, conversationPipelineResolver);
  }

  /**
   * Adds functions to the pipeline resolver
   * @param ctx - The transformer context provider
   * @param resolver - The transformer resolver
   * @param capitalizedFieldName - The capitalized field name
   * @param runtime - The runtime configuration
   */
  private addPipelineResolverFunctions(
    ctx: TransformerContextProvider,
    resolver: TransformerResolver,
    capitalizedFieldName: string,
    initResolverFunction: MappingTemplateProvider,
    authResolverFunction: MappingTemplateProvider,
    verifySessionOwnerResolverFunction: MappingTemplateProvider,
    writeMessageToTableFunction: MappingTemplateProvider,
  ): void {
    // Add init function
    resolver.addJsFunctionToSlot('init', initResolverFunction);

    // Add auth function
    resolver.addJsFunctionToSlot('auth', authResolverFunction);

    // Add verifySessionOwner function
    const sessionModelName = `Conversation${capitalizedFieldName}`;
    const sessionModelDDBDataSourceName = getModelDataSourceNameForTypeName(ctx, sessionModelName);
    const conversationSessionDDBDataSource = ctx.api.host.getDataSource(sessionModelDDBDataSourceName);
    resolver.addJsFunctionToSlot('verifySessionOwner', verifySessionOwnerResolverFunction, conversationSessionDDBDataSource as any);

    // Add writeMessageToTable function
    const messageModelName = `ConversationMessage${capitalizedFieldName}`;
    const messageModelDDBDataSourceName = getModelDataSourceNameForTypeName(ctx, messageModelName);
    const messageDDBDataSource = ctx.api.host.getDataSource(messageModelDDBDataSourceName);
    resolver.addJsFunctionToSlot('writeMessageToTable', writeMessageToTableFunction, messageDDBDataSource as any);
  }

  /**
   * Creates the assistant response resolver
   * @param ctx - The transformer context provider
   * @param directive - The conversation directive configuration
   * @param capitalizedFieldName - The capitalized field name
   */
  private createAssistantResponseResolver(
    ctx: TransformerContextProvider,
    directive: ConversationDirectiveConfiguration,
    capitalizedFieldName: string,
    initResolverFunction: MappingTemplateProvider,
    authResolverFunction: MappingTemplateProvider,
    verifySessionOwnerResolverFunction: MappingTemplateProvider,
  ): void {
    const assistantResponseResolverResourceId = ResolverResourceIDs.ResolverResourceID('Mutation', directive.responseMutationName);
    const assistantResponseResolverFunction = assistantMutationResolver(directive);
    const conversationMessageDataSourceName = getModelDataSourceNameForTypeName(ctx, `ConversationMessage${capitalizedFieldName}`);
    const conversationMessageDataSource = ctx.api.host.getDataSource(conversationMessageDataSourceName);
    const resolver = new TransformerResolver(
      'Mutation',
      directive.responseMutationName,
      assistantResponseResolverResourceId,
      { codeMappingTemplate: assistantResponseResolverFunction },
      ['init', 'auth', 'verifySessionOwner'],
      [],
      conversationMessageDataSource as any,
      APPSYNC_JS_RUNTIME,
    );

    // Add init function
    resolver.addJsFunctionToSlot('init', initResolverFunction);

    // Add auth function
    resolver.addJsFunctionToSlot('auth', authResolverFunction);

    // Add verifySessionOwner function
    const sessionModelName = `Conversation${capitalizedFieldName}`;
    const sessionModelDDBDataSourceName = getModelDataSourceNameForTypeName(ctx, sessionModelName);
    const conversationSessionDDBDataSource = ctx.api.host.getDataSource(sessionModelDDBDataSourceName);
    resolver.addJsFunctionToSlot('verifySessionOwner', verifySessionOwnerResolverFunction, conversationSessionDDBDataSource as any);

    ctx.resolvers.addResolver('Mutation', directive.responseMutationName, resolver);
  }

  /**
   * Creates the assistant response subscription resolver
   * @param ctx - The transformer context provider
   * @param capitalizedFieldName - The capitalized field name
   */
  private createAssistantResponseSubscriptionResolver(
    ctx: TransformerContextProvider,
    directive: ConversationDirectiveConfiguration,
    capitalizedFieldName: string,
  ): void {
    const onAssistantResponseSubscriptionFieldName = `onCreateAssistantResponse${capitalizedFieldName}`;
    const onAssistantResponseSubscriptionResolverResourceId = ResolverResourceIDs.ResolverResourceID(
      'Subscription',
      onAssistantResponseSubscriptionFieldName,
    );
    const onAssistantResponseSubscriptionResolverFunction = conversationMessageSubscriptionMappingTamplate(directive);

    const mappingTemplate = {
      codeMappingTemplate: onAssistantResponseSubscriptionResolverFunction,
    };
    const onAssistantResponseSubscriptionResolver = new TransformerResolver(
      'Subscription',
      onAssistantResponseSubscriptionFieldName,
      onAssistantResponseSubscriptionResolverResourceId,
      mappingTemplate,
      [],
      [],
      undefined,
      APPSYNC_JS_RUNTIME,
    );

    ctx.resolvers.addResolver('Subscription', onAssistantResponseSubscriptionFieldName, onAssistantResponseSubscriptionResolver);
  }

  /**
   * Adds a Lambda data source to the API
   * @param ctx - The transformer context provider
   * @param functionDataSourceId - The function data source ID
   * @param referencedFunction - The referenced Lambda function
   * @param capitalizedFieldName - The capitalized field name
   * @returns The created function data source
   */
  private addLambdaDataSource(
    ctx: TransformerContextProvider,
    functionDataSourceId: string,
    referencedFunction: IFunction,
    capitalizedFieldName: string,
  ): any {
    const functionDataSourceScope = ctx.stackManager.getScopeFor(
      functionDataSourceId,
      `${capitalizedFieldName}ConversationDirectiveLambdaStack`,
    );
    return ctx.api.host.addLambdaDataSource(functionDataSourceId, referencedFunction, {}, functionDataSourceScope);
  }

  private addInitSlotToListMessagesPipeline(ctx: TransformerContextProvider, directive: ConversationDirectiveConfiguration): void {
    const messageModelName = directive.messageModel.messageModel.name.value;
    const pluralized = pluralize(messageModelName);
    const listMessagesResolver = ctx.resolvers.getResolver('Query', `list${pluralized}`) as TransformerResolver;
    const initResolverFn = listMessageInitMappingTemplate(directive);
    listMessagesResolver.addJsFunctionToSlot('init', initResolverFn);
  }

  /**
   * Sets up the message table index
   * @param ctx - The transformer context provider
   * @param directive - The conversation directive configuration
   */
  private setupMessageTableIndex(ctx: TransformerContextProvider, directive: ConversationDirectiveConfiguration): void {
    const messageModelName = directive.messageModel.messageModel.name.value;
    const referenceFieldName = 'conversationId';
    const messageModel = directive.messageModel.messageModel;

    const conversationMessagesTable = getTable(ctx, messageModel);
    const gsiPartitionKeyName = referenceFieldName;
    const gsiPartitionKeyType = 'S';
    const gsiSortKeyName = 'createdAt';
    const gsiSortKeyType = 'S';
    const indexName = 'gsi-ConversationMessage.conversationId.createdAt';

    this.addGlobalSecondaryIndex(
      conversationMessagesTable,
      indexName,
      { name: gsiPartitionKeyName, type: gsiPartitionKeyType },
      { name: gsiSortKeyName, type: gsiSortKeyType },
      ctx,
      messageModelName,
    );
  }

  private addGlobalSecondaryIndex(
    table: any,
    indexName: string,
    partitionKey: KeyAttributeDefinition,
    sortKey: KeyAttributeDefinition,
    ctx: TransformerContextProvider,
    typeName: string,
  ): void {
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
  }
}
