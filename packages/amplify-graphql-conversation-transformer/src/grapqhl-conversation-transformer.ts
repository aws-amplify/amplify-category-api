import { BelongsToDirective, ConversationDirective, HasManyDirective, ModelDirective } from '@aws-amplify/graphql-directives';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import {
  DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  DirectiveWrapper,
  InvalidDirectiveError,
  InvalidTransformerError,
  TransformerPluginBase,
  generateGetArgumentsInput,
  MappingTemplate,
  TransformerResolver,
  getModelDataSourceNameForTypeName,
} from '@aws-amplify/graphql-transformer-core';
import { NONE_DATA_SOURCE_NAME } from '@aws-amplify/graphql-transformer-core/src/transformer-context';
import {
  MappingTemplateProvider,
  TransformerAuthProvider,
  TransformerContextProvider,
  TransformerPreProcessContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  DefinitionNode,
  DirectiveNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  ObjectValueNode,
} from 'graphql';
import {
  blankObject,
  FunctionResourceIDs,
  makeArgument,
  makeDirective,
  makeField,
  makeListType,
  makeNamedType,
  makeNonNullType,
  makeValueNode,
  ResolverResourceIDs,
  ResourceConstants,
  wrapNonNull,
} from 'graphql-transformer-common';
import produce from 'immer';
import { WritableDraft, has } from 'immer/dist/internal';
import { dedent } from 'ts-dedent';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';



export type ConversationDirectiveConfiguration = {
  parent: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  aiModel: string;
  functionName: string;
  field: FieldDefinitionNode;
};

const CONVERSATION_DIRECTIVE_STACK = 'ConversationDirectiveStack';

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

    const conversationDirectiveFields = mutationObjectContainingConversationDirectives[0].fields;
    if (!conversationDirectiveFields) {
      throw new Error('No conversation directives found despite expecting them in mutateSchema of conversation-transformer');
    }
    const document: DocumentNode = produce(ctx.inputDocument, (draft: WritableDraft<DocumentNode>) => {
      // once
      const conversationEventSender = makeConversationEventSenderType();
      draft.definitions.push(conversationEventSender as WritableDraft<EnumTypeDefinitionNode>);
      // for each directive

      for (const conversationDirectiveField of conversationDirectiveFields) {
        const sessionModelName = `ConversationSession${conversationDirectiveField.name.value}`;
        const messageModelName = `ConversationMessage${conversationDirectiveField.name.value}`;

        const referenceFieldName = 'sessionId';

        const sessionAuthDirective = createSessionAuthDirective();
        const sessionModelDirective = createSessionModelDirective();
        const sessionMessagesHasManyDirective = createSessionModelMessagesFieldHasManyDirective(referenceFieldName);
        const sessionMessagesField = createSessionModelMessagesField(sessionMessagesHasManyDirective, messageModelName);
        const sessionModel = makeConversationSessionModel(sessionModelName, sessionMessagesField, [
          sessionModelDirective,
          sessionAuthDirective,
        ]);

        const messageAuthDirective = createMessageAuthDirective();
        const messageModelDirective = createMessageModelDirective();
        const messageSessionFieldBelongsToDirective = createMessageSessionFieldBelongsToDirective(referenceFieldName);
        const messageSessionField = createMessageSessionField(messageSessionFieldBelongsToDirective, sessionModelName);
        const messageModel = makeConversationMessageModel(messageModelName, messageSessionField, referenceFieldName, [
          messageModelDirective,
          messageAuthDirective,
        ]);

        draft.definitions.push(sessionModel as WritableDraft<ObjectTypeDefinitionNode>);
        draft.definitions.push(messageModel as WritableDraft<ObjectTypeDefinitionNode>);
      }
    });
    return document;
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    // const stack = ctx.stackManager.createStack(CONVERSATION_DIRECTIVE_STACK);
    for (const directive of this.directives) {
      const { parent, field } = directive;
      const parentName = parent.name.value;
      const fieldName = field.name.value;
      const resolverResourceId = ResolverResourceIDs.ResolverResourceID(parentName, fieldName);

      // const requestMappingTemplate = MappingTemplate.inlineTemplateFromString('request');
      // const responseMappingTemplate = MappingTemplate.inlineTemplateFromString('response');

      // invokeLambda

      // Note: trying to use lambda function as data resolver.

      // TODO: Support single function for multiple routes.

      // TODO: Do we really need to create a nested stack here?
      const functionStack = ctx.stackManager.createStack('ConversationDirectiveLambdaStack');

      // TODO: Add function name arg to conversation directive and pull from that.
      const functionDataSourceId = FunctionResourceIDs.FunctionDataSourceID(directive.functionName);
      const referencedFunction = lambda.Function.fromFunctionAttributes(functionStack, `${functionDataSourceId}Function`, {
        functionArn: lambdaArnResource(directive.functionName),
      });
      const functionDataSourceScope = ctx.stackManager.getScopeFor(functionDataSourceId, 'ConversationDirectiveLambdaStack');
      const functionDataSource = ctx.api.host.addLambdaDataSource(functionDataSourceId, referencedFunction, {}, functionDataSourceScope);

      const invokeLambdaFunction = invokeLambdaMappingTemplate(parentName, fieldName);

      // pipeline resolver
      const conversationPipelineResolver = new TransformerResolver(
        parentName,
        fieldName,
        resolverResourceId,
        invokeLambdaFunction.req,
        invokeLambdaFunction.res,
        ['init', 'auth', 'verifySessionOwner', 'writeMessageToTable', 'retrieveMessageHistory', 'invokeLambda'],
        ['handleLambdaResponse', 'finish'],
        functionDataSource,
        { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' },
      );

      // init
      const initFunction = initMappingTemplate(parentName, fieldName);
      conversationPipelineResolver.addToSlot('init', initFunction.req, initFunction.res);

      // auth
      const authFunction = authMappingTemplate(parentName, fieldName);
      conversationPipelineResolver.addToSlot('auth', authFunction.req, authFunction.res);

      const sessionModelDDBDataSourceName = getModelDataSourceNameForTypeName(ctx, `ConversationSession${fieldName}`);
      const conversationSessionDDBDataSource = ctx.api.host.getDataSource(sessionModelDDBDataSourceName);

      // verifySessionOwner
      const verifySessionOwnerFunction = verifySessionOwnerMappingTemplate(parentName, fieldName);
      conversationPipelineResolver.addToSlot(
        'verifySessionOwner',
        verifySessionOwnerFunction.req,
        verifySessionOwnerFunction.res,
        conversationSessionDDBDataSource as any,
      );

      // writeMessageToTable
      const messageModelDDBDataSourceName = getModelDataSourceNameForTypeName(ctx, `ConversationMessage${fieldName}`);
      const messageDDBDataSource = ctx.api.host.getDataSource(messageModelDDBDataSourceName);
      const writeMessageToTableFunction = writeMessageToTableMappingTemplate(parentName, fieldName);
      conversationPipelineResolver.addToSlot(
        'writeMessageToTable',
        writeMessageToTableFunction.req,
        writeMessageToTableFunction.res,
        messageDDBDataSource as any,
      );

      // retrieveMessageHistory
      const retrieveMessageHistoryFunction = readHistoryMappingTemplate(parentName, fieldName);
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
    ctx.output.addEnum(makeConversationEventSenderType());

    for (const directive of this.directives) {
      const sessionModelName = `ConversationSession${directive.field.name.value}`;
      const messageModelName = `ConversationMessage${directive.field.name.value}`;
      const referenceFieldName = 'sessionId';

      const sessionAuthDirective = createSessionAuthDirective();
      const sessionModelDirective = createSessionModelDirective();
      const sessionMessagesHasManyDirective = createSessionModelMessagesFieldHasManyDirective(referenceFieldName);
      const sessionMessagesField = createSessionModelMessagesField(sessionMessagesHasManyDirective, messageModelName);
      const sessionModel = makeConversationSessionModel(sessionModelName, sessionMessagesField, [
        sessionModelDirective,
        sessionAuthDirective,
      ]);

      const messageAuthDirective = createMessageAuthDirective();
      const messageModelDirective = createMessageModelDirective();
      const messageSessionFieldBelongsToDirective = createMessageSessionFieldBelongsToDirective(referenceFieldName);
      const messageSessionField = createMessageSessionField(messageSessionFieldBelongsToDirective, sessionModelName);
      const messageModel = makeConversationMessageModel(messageModelName, messageSessionField, referenceFieldName, [
        messageModelDirective,
        messageAuthDirective,
      ]);

      ctx.output.addObject(sessionModel);
      ctx.output.addObject(messageModel);

      ctx.providerRegistry.registerDataSourceProvider(sessionModel, this.modelTransformer);
      ctx.providerRegistry.registerDataSourceProvider(messageModel, this.modelTransformer);

      ctx.dataSourceStrategies[sessionModelName] = DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY;
      ctx.dataSourceStrategies[messageModelName] = DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY;

      this.modelTransformer.object(sessionModel, sessionModelDirective, ctx);
      this.modelTransformer.object(messageModel, messageModelDirective, ctx);

      this.belongsToTransformer.field(messageModel, messageSessionField, messageSessionFieldBelongsToDirective, ctx);
      this.hasManyTransformer.field(sessionModel, sessionMessagesField, sessionMessagesHasManyDirective, ctx);

      if (!this.authProvider.object) {
        // TODO: error message
        throw new InvalidTransformerError('No auth provider found -- uh oh');
      }
      this.authProvider.object(sessionModel, sessionAuthDirective, ctx);
      this.authProvider.object(messageModel, messageAuthDirective, ctx);
    }
  };
}

const validate = (config: ConversationDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  // validation logic
  // console.log(JSON.stringify(config));
  // console.log(ctx);
};

const makeConversationEventSenderType = (): EnumTypeDefinitionNode => {
  /*
    enum ConversationMessageSender {
      user
      assistant
    }
  */
  const conversationMessageSender: EnumTypeDefinitionNode = {
    kind: 'EnumTypeDefinition',
    name: {
      kind: 'Name',
      value: 'ConversationMessageSender',
    },
    values: [
      {
        kind: 'EnumValueDefinition',
        name: {
          kind: 'Name',
          value: 'user',
        },
      },
      {
        kind: 'EnumValueDefinition',
        name: {
          kind: 'Name',
          value: 'assistant',
        },
      },
    ],
  };
  return conversationMessageSender;
};

const createSessionAuthDirective = (): DirectiveNode => {
  return makeDirective('auth', [
    makeArgument('rules', {
      kind: Kind.LIST,
      values: [
        {
          kind: Kind.OBJECT,
          fields: [
            {
              kind: Kind.OBJECT_FIELD,
              name: { kind: Kind.NAME, value: 'allow' },
              value: { kind: Kind.ENUM, value: 'owner' },
            },
            {
              kind: Kind.OBJECT_FIELD,
              name: { kind: Kind.NAME, value: 'ownerField' },
              value: { kind: Kind.STRING, value: 'owner' },
            },
          ],
        },
      ],
    }),
  ]);
};

const createSessionModelDirective = (): DirectiveNode => {
  const subscriptionsOffValue: ObjectValueNode = {
    kind: Kind.OBJECT,
    fields: [
      {
        kind: Kind.OBJECT_FIELD,
        name: { kind: Kind.NAME, value: 'level' },
        value: { kind: Kind.ENUM, value: 'off' },
      },
    ],
  };
  return makeDirective('model', [
    makeArgument('subscriptions', subscriptionsOffValue),
    makeArgument('mutations', makeValueNode({ update: null })),
  ]);
};

const createSessionModelMessagesFieldHasManyDirective = (fieldName: string): DirectiveNode => {
  const referencesArg = makeArgument('references', makeValueNode(fieldName));
  return makeDirective(HasManyDirective.name, [referencesArg]);
};

const createSessionModelMessagesField = (hasManyDirective: DirectiveNode, typeName: string): FieldDefinitionNode => {
  return makeField('messages', [], makeListType(makeNamedType(typeName)), [hasManyDirective]);
};

const makeConversationSessionModel = (
  modelName: string,
  messagesField: FieldDefinitionNode,
  typeLevelDirectives: DirectiveNode[],
): ObjectTypeDefinitionNode => {
  /*
    type ConversationSession_pirateChat
    @model
    @auth(rules: [{allow: owner, ownerField: "owner"}])
    {
        events: [ConversationMessage_pirateChat] @hasMany(references: "conversationSessionId")
    }
  */

  // fields
  const id = makeField('id', [], wrapNonNull(makeNamedType('ID')));
  const name = makeField('name', [], makeNamedType('String'));
  const metadata = makeField('metadata', [], makeNamedType('AWSJSON'));

  const object = {
    ...blankObject(modelName),
    fields: [id, name, metadata, messagesField],
    directives: typeLevelDirectives,
  };
  return object;
};

const createMessageModelDirective = (): DirectiveNode => {
  return makeDirective('model', [
    makeArgument('subscriptions', makeValueNode({ onUpdate: null, onDelete: null })),
    makeArgument('mutations', makeValueNode({ update: null })),
  ]);
};

const createMessageAuthDirective = (): DirectiveNode => {
  return makeDirective('auth', [
    makeArgument('rules', {
      kind: Kind.LIST,
      values: [
        {
          kind: Kind.OBJECT,
          fields: [
            {
              kind: Kind.OBJECT_FIELD,
              name: { kind: Kind.NAME, value: 'allow' },
              value: { kind: Kind.ENUM, value: 'owner' },
            },
            {
              kind: Kind.OBJECT_FIELD,
              name: { kind: Kind.NAME, value: 'ownerField' },
              value: { kind: Kind.STRING, value: 'owner' },
            },
          ],
        },
      ],
    }),
  ]);
};

const createMessageSessionFieldBelongsToDirective = (referenceFieldName: string): DirectiveNode => {
  const referencesArg = makeArgument('references', makeValueNode(referenceFieldName));
  return makeDirective(BelongsToDirective.name, [referencesArg]);
};

const createMessageSessionField = (belongsToDirective: DirectiveNode, typeName: string): FieldDefinitionNode => {
  return makeField('session', [], makeNamedType(typeName), [belongsToDirective]);
};

const makeConversationMessageModel = (
  modelName: string,
  sessionField: FieldDefinitionNode,
  referenceFieldName: string,
  typeDirectives: DirectiveNode[],
): ObjectTypeDefinitionNode => {
  /*
  type ConversationEvent<route-name>
  @model(
      subscriptions: {
          onUpdate: null,
          onDelete: null
      },
      mutations: {
          update: null
      }
  )
  @auth(rules: [{allow: owner, ownerField: "owner"}])
  {
    conversationSessionId: ID!
    session: ConversationSession<route-name> @belongsTo(references: ["conversationSessionId"])
    sender: ConversationEventSenderType! // "user" | "assistant"
    message: String!
    context: AWSJSON
    uiComponents: [AWSJSON]
  }
  */

  // model directives
  // field directives

  // fields
  const id = makeField('id', [], wrapNonNull(makeNamedType('ID')));
  const sessionId = makeField(referenceFieldName, [], wrapNonNull(makeNamedType('ID')));
  const sender = makeField('sender', [], makeNamedType('ConversationMessageSender'));
  const content = makeField('content', [], makeNamedType('String'));
  const context = makeField('context', [], makeNamedType('AWSJSON'));
  const uiComponents = makeField('uiComponents', [], makeListType(makeNamedType('AWSJSON')));

  const object = {
    ...blankObject(modelName),
    fields: [id, sessionId, sessionField, sender, content, context, uiComponents],
    directives: typeDirectives,
  };

  return object;
};

// #region Resolvers

// #region Init Resolver

const initMappingTemplate = (parentName: string, fieldName: string): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.inlineTemplateFromString(dedent`
    export function request(ctx) {
      ctx.stash.defaultValues = ctx.stash.defaultValues ?? {};
      ctx.stash.defaultValues.id = util.autoId();
      const createdAt = util.time.nowISO8601();
      ctx.stash.defaultValues.createdAt = createdAt;
      ctx.stash.defaultValues.updatedAt = createdAt;
      return {
        version: '2018-05-09',
        payload: {}
      };
    }`);

  const res = MappingTemplate.inlineTemplateFromString(dedent`
    export function response(ctx) {
      return {};
    }`);

  return { req, res };
};

// #endregion Init Resolver

// #region Auth Resolver

const authMappingTemplate = (parentName: string, fieldName: string): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.inlineTemplateFromString(dedent`
    export function request(ctx) {
      ctx.stash.hasAuth = true;
      const isAuthorized = false;

      if (util.authType() === 'User Pool Authorization') {
        if (!isAuthorized) {
          const authFilter = [];
          let ownerClaim0 = ctx.identity['claims']['sub'];
          ctx.args.owner = ownerClaim0;
          const currentClaim1 = ctx.identity['claims']['username'] ?? ctx.identity['claims']['cognito:username'];
          if (ownerClaim0 && currentClaim1) {
            ownerClaim0 = ownerClaim0 + '::' + currentClaim1;
            authFilter.push({ owner: { eq: ownerClaim0 } })
          }
          const role0_0 = ctx.identity['claims']['sub'];
          if (role0_0) {
            authFilter.push({ owner: { eq: role0_0 } });
          }
          // we can just reuse currentClaim1 here, but doing this (for now) to mirror the existing
          // vtl auth resolver.
          const role0_1 = ctx.identity['claims']['username'] ?? ctx.identity['claims']['cognito:username'];
          if (role0_1) {
            authFilter.push({ owner: { eq: role0_1 }});
          }
          if (authFilter.length !== 0) {
            ctx.stash.authFilter = { or: authFilter };
          }
        }
      }
      if (!isAuthorized && ctx.stash.authFilter.length === 0) {
        util.unauthorized();
      }
      return { version: '2018-05-29', payload: {} };
    }
    `);

  const res = MappingTemplate.inlineTemplateFromString(dedent`
    export function response(ctx) {
      return {};
    }`);

  return { req, res };
};

// #endregion Auth Resolver

// #region VerifySessionOwner Resolver

const verifySessionOwnerMappingTemplate = (
  parentName: string,
  fieldName: string,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.inlineTemplateFromString(dedent`
    export function request(ctx) {
      const { authFilter } = ctx.stash;

      const query = {
        expression: 'id = :id',
        expressionValues: util.dynamodb.toMapValues({
          ':id': ctx.args.sessionId
        })
      };

      const filter = JSON.parse(util.transform.toDynamoDBFilterExpression(authFilter));

      return {
        operation: 'Query',
        query,
        filter
      };
    }
    `);

  const res = MappingTemplate.inlineTemplateFromString(dedent`
    export function response(ctx) {
      if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
      }
      if (ctx.result.items.length !== 0 && ctx.result.scannedCount === 1) {
        return ctx.result.items[0];
      } else if (ctx.result.items.legnth === 0 && ctx.result.scannedCount === 1) {
        util.unauthorized();
      }
      return null;
    }`);

  return { req, res };
};

// #endregion VerifySessionOwner Resolver

// #region WriteMessageToTable Resolver

const writeMessageToTableMappingTemplate = (
  parentName: string,
  fieldName: string,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.inlineTemplateFromString(dedent`
    import { util } from '@aws-appsync/utils'
    import * as ddb from '@aws-appsync/utils/dynamodb'

    export function request(ctx) {
      const args = ctx.stash.transformedArgs ?? ctx.args;
      const defaultValues = ctx.stash.defaultValues ?? {};
      const message = {
          __typename: 'ConversationMessage${fieldName}',
          sender: 'user',
          ...args,
          ...defaultValues,
      };
      const id = util.autoId();

      return ddb.put({ key: id, message });
    }
    `);

  const res = MappingTemplate.inlineTemplateFromString(dedent`
    export function response(ctx) {
      if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
      } else {
        return ctx.result;
      }
    }`);

  return { req, res };
};
// #endregion WriteMessageToTable Resolver

// #region ReadHistory Resolver
const readHistoryMappingTemplate = (
  parentName: string,
  fieldName: string,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.inlineTemplateFromString(dedent`
    export function request(ctx) {
      const { sessionId } = ctx.args;
      const { authFilter } = ctx.stash;

      const limit = 100;
      const query = {
        expression: 'sessionId = :sessionId',
        expressionValues: util.dynamodb.toMapValues({
          ':sessionId': ctx.args.sessionId
        })
      };

      const filter = JSON.parse(util.transform.toDynamoDBFilterExpression(authFilter));
      const index = 'gsi-ConversationSession${fieldName}.messages';

      return {
        operation: 'Query',
        query,
        filter,
        index,
      }
    }
    `);

  const res = MappingTemplate.inlineTemplateFromString(dedent`
    export function response(ctx) {
      if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
      }
      return ctx.result;
    }`);

  return { req, res };
};

// #endregion ReadHistory Resolver

// #region InvokeLambda Resolver

const invokeLambdaMappingTemplate = (
  parentName: string,
  fieldName: string,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.inlineTemplateFromString(dedent`
    export function request(ctx) {
    const { args, identity, source, request, prev } = ctx;
      const { typeName, fieldName } = ctx.stash;

      const payload = {
        typeName,
        fieldName,
        args,
        identity,
        source,
        request,
        prev
      };

      return {
        operation: 'Invoke',
        payload,
        invocationType: 'Event'
      };
    }`);

  const res = MappingTemplate.inlineTemplateFromString(dedent`
    export function response(ctx) {
      let success = true;
      if (ctx.error) {
        util.appendError(ctx.error.message, ctx.error.type);
        success = false;
      }
      return { success };
    }`);

  return { req, res };
};

const lambdaArnResource = (name: string): string => {
  // eslint-disable-next-line no-template-curly-in-string
  return cdk.Fn.sub('arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${name}', { name });
};

const lambdaArnKey = (name: string, region?: string, accountId?: string): string => {
  // eslint-disable-next-line no-template-curly-in-string
  return `arn:aws:lambda:${region ? region : '${AWS::Region}'}:${accountId ? accountId : '${AWS::AccountId}'}:function:${name}`;
};

// #endregion InvokeLambda Resolver

// #endregion Resolvers

// const functionDataSourceName = '';
// const dataSource = ctx.api.host.getDataSource(functionDataSourceName);

// TODO: pull this from directive config (once it's added there).
// const mutationResolver = ctx.resolvers.generateMutationResolver(
//   parentName,
//   fieldName,
//   resolverResourceId,
//   dataSource as any,
//   MappingTemplate.inlineTemplateFromString('request'),
//   MappingTemplate.inlineTemplateFromString('response'),
// )

// TODO: setting the scope necessary?
// conversationPipelineResolver.setScope(ctx.stackManager.getScopeFor(resolverResourceId, fieldName));
// const conversationStackScope = ctx.stackManager.getScopeFor(resolverResourceId, fieldName);

// const initResponseMappingTemplate = MappingTemplate.inlineTemplateFromString(dedent`
//   $util.toJson({})
// `);

// const initFunctionId = `${parentName}${fieldName}InitFunction`
// const initFunction = ctx.api.host.addAppSyncFunction(
//   initFunctionId,
//   initRequestMappingTemplate,
//   initResponseMappingTemplate,
//   'NONE_DS',
//   conversationStackScope,
// )

// ctx.api.host.addResolver(
//   parentName,
//   fieldName,
//   requestMappingTemplate,
//   responseMappingTemplate,
//   resolverResourceId,
//   undefined,
//   [initFunction.functionId],
//   conversationStackScope
// )
