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
  makeArgument,
  makeDirective,
  makeField,
  makeListType,
  makeNamedType,
  makeNonNullType,
  makeValueNode,
  ResolverResourceIDs,
  wrapNonNull,
} from 'graphql-transformer-common';
import produce from 'immer';
import { WritableDraft, has } from 'immer/dist/internal';
import { dedent } from 'ts-dedent';

export type ConversationDirectiveConfiguration = {
  parent: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  aiModel: string;
  // sessionModel: ObjectTypeDefinitionNode;
  // messagesModel: ObjectTypeDefinitionNode;
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
    // assert that parent.name.value == 'Mutation'
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
    console.log('>>> field');
  };

  mutateSchema = (ctx: TransformerPreProcessContextProvider): DocumentNode => {
    console.log('>>> invokedMutateSchema');
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
    console.log('>>> invokedGenerateResolvers');
    // console.log('context in generateResolvers', context);

    // if (!ctx.api.host.hasDataSource(NONE_DATA_SOURCE_NAME)) {
    //   ctx.api.host.addNoneDataSource(NONE_DATA_SOURCE_NAME, {
    //     name: NONE_DATA_SOURCE_NAME,
    //     description: 'None Data Source for Pipeline functions',
    //   });
    // }

    // const stack = ctx.stackManager.createStack(CONVERSATION_DIRECTIVE_STACK);
    for (const directive of this.directives) {
      const { parent, field } = directive;
      const parentName = parent.name.value;
      const fieldName = field.name.value;
      const resolverResourceId = ResolverResourceIDs.ResolverResourceID(parentName, fieldName);

      const requestMappingTemplate = MappingTemplate.inlineTemplateFromString('request');
      const responseMappingTemplate = MappingTemplate.inlineTemplateFromString('response');

      // pipeline resolver
      const conversationPipelineResolver = new TransformerResolver(
        parentName,
        fieldName,
        resolverResourceId,
        requestMappingTemplate,
        responseMappingTemplate,
        ['init', 'auth', 'verifySessionOwner', 'writeMessageToTable', 'retrieveMessageHistory', 'invokeLambda'],
        ['handleLambdaResponse', 'finish'],
        undefined,
        { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' }
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


      // invokeLambda

      // handleLambdaResponse

      // finish

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
      // const sessionModel = makeConversationSessionModel(sessionModelName, messageModelName, 'conversationSessionId');

      const messageAuthDirective = createMessageAuthDirective();
      const messageModelDirective = createMessageModelDirective();
      const messageSessionFieldBelongsToDirective = createMessageSessionFieldBelongsToDirective(referenceFieldName);
      const messageSessionField = createMessageSessionField(messageSessionFieldBelongsToDirective, sessionModelName);
      const messageModel = makeConversationMessageModel(messageModelName, messageSessionField, referenceFieldName, [
        messageModelDirective,
        messageAuthDirective,
      ]);
      // const messagesModel = makeConversationMessageModel(messageModelName, sessionModel);
      // Conflicting type 'ConversationSessionpirateChat' found.
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
  // messageModelName: string,
  // referenceFieldName: string,
): ObjectTypeDefinitionNode => {
  /*
    type ConversationSession_pirateChat
    @model
    @auth(rules: [{allow: owner, ownerField: "owner"}])
    {
        events: [ConversationMessage_pirateChat] @hasMany(references: "conversationSessionId")
    }
  */

  // field directives
  // const referencesArg = makeArgument('references', makeValueNode(referenceFieldName));
  // const hasManyDirective = makeDirective(HasManyDirective.name, [referencesArg]);

  // fields
  const id = makeField('id', [], wrapNonNull(makeNamedType('ID')));
  const name = makeField('name', [], makeNamedType('String'));
  const metadata = makeField('metadata', [], makeNamedType('AWSJSON'));
  // const messages = makeField('messages', [], makeListType(makeNamedType(messageModelName)), [hasManyDirective]);

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
  // sessionModel: ObjectTypeDefinitionNode
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
  const conversationSessionId = makeField(referenceFieldName, [], wrapNonNull(makeNamedType('ID')));
  // const session = makeField('session', [], makeNamedType(sessionModel.name.value), [makeBelongsToDirective(conversationSessionId)]);
  const sender = makeField('sender', [], makeNamedType('ConversationMessageSender'));
  const content = makeField('content', [], makeNamedType('String'));
  const context = makeField('context', [], makeNamedType('AWSJSON'));
  const uiComponents = makeField('uiComponents', [], makeListType(makeNamedType('AWSJSON')));

  const object = {
    ...blankObject(modelName),
    fields: [id, conversationSessionId, sessionField, sender, content, context, uiComponents],
    directives: typeDirectives,
  };

  return object;
};

// #region Resolvers

// #region Init Resolver

const initMappingTemplate = (parentName: string, fieldName: string): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    $util.qr($ctx.stash.put("defaultValues", $util.defaultIfNull($ctx.stash.defaultValues, {})))
    $util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))
    #set( $createdAt = $util.time.nowISO8601() )
    $util.qr($ctx.stash.defaultValues.put("createdAt", $createdAt))
    $util.qr($ctx.stash.defaultValues.put("updatedAt", $createdAt))
    $util.toJson({
      "version": "2018-05-29",
      "payload": {}
    })
    ## [End] Initialization default values. **
  `,
    `${parentName}.${fieldName}.init.req.vtl`,
  );

  const res = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    $util.toJson({})
  `,
    `${parentName}.${fieldName}.init.res.vtl`,
  );

  const jsReq = MappingTemplate.s3MappingTemplateFromString(
    dedent`
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
    }
    `,
    `${parentName}.${fieldName}.init.req.js`,
  )

  const jsRes = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    export function response(ctx) {
      return {};
    }
    `,
    `${parentName}.${fieldName}.init.res.js`,
  )
  return { req: jsReq, res: jsRes}
  return { req, res };
};

// #endregion Init Resolver

// #region Auth Resolver

const authMappingTemplate = (parentName: string, fieldName: string): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    $util.qr($ctx.stash.put("hasAuth", true))
    #set( $isAuthorized = false )
    #set( $primaryFieldMap = {} )
    #if( $util.authType() == "User Pool Authorization" )
      #if( !$isAuthorized )
        #set( $authFilter = [] )
        #set( $ownerClaim0 = $util.defaultIfNull($ctx.identity.claims.get("sub"), null) )
        $util.qr($ctx.args.put("owner", $ownerClaim0))
        #set( $currentClaim1 = $util.defaultIfNull($ctx.identity.claims.get("username"), $util.defaultIfNull($ctx.identity.claims.get("cognito:username"), null)) )
        #if( !$util.isNull($ownerClaim0) && !$util.isNull($currentClaim1) )
          #set( $ownerClaim0 = "$ownerClaim0::$currentClaim1" )
          #if( !$util.isNull($ownerClaim0) )
            $util.qr($authFilter.add({"owner": { "eq": $ownerClaim0 }}))
          #end
        #end
        #set( $role0_0 = $util.defaultIfNull($ctx.identity.claims.get("sub"), null) )
        #if( !$util.isNull($role0_0) )
          $util.qr($authFilter.add({"owner": { "eq": $role0_0 }}))
        #end
        #set( $role0_1 = $util.defaultIfNull($ctx.identity.claims.get("username"), $util.defaultIfNull($ctx.identity.claims.get("cognito:username"), null)) )
        #if( !$util.isNull($role0_1) )
          $util.qr($authFilter.add({"owner": { "eq": $role0_1 }}))
        #end
        #if( !$authFilter.isEmpty() )
          $util.qr($ctx.stash.put("authFilter", { "or": $authFilter }))
        #end
      #end
    #end
    #if( !$isAuthorized && $util.isNull($ctx.stash.authFilter) )
    $util.unauthorized()
    #end
    $util.toJson({"version":"2018-05-29","payload":{}})
    `,
    `${parentName}.${fieldName}.auth.req.vtl`,
  );

  const res = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    $util.toJson({})
  `,
    `${parentName}.${fieldName}.auth.res.vtl`,
  );

  const jsReq = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    export function request(ctx) {
      ctx.stash.hasAuth = true;
      const isAuthorized = false;

      if (util.)
      return {};
    }
    `,
    `${parentName}.${fieldName}.auth.req.js`,
  )

  const jsRes = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    export function response(ctx) {
      return {};
    }
    `,
    `${parentName}.${fieldName}.auth.res.js`,
  )
  return { req: jsReq, res: jsRes}
  // return { req, res };
};

// #endregion Auth Resolver

// #region VerifySessionOwner Resolver

const verifySessionOwnerMappingTemplate = (
  parentName: string,
  fieldName: string,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.s3MappingTemplateFromString(
    dedent`
  #set( $GetRequest = {
    "version": "2018-05-29",
    "operation": "Query"
  } )
  #if( $ctx.stash.metadata.modelObjectKey )
    #set( $expression = "" )
    #set( $expressionNames = {} )
    #set( $expressionValues = {} )
    #foreach( $item in $ctx.stash.metadata.modelObjectKey.entrySet() )
      #set( $expression = "$expression#keyCount$velocityCount = :valueCount$velocityCount AND " )
      $util.qr($expressionNames.put("#keyCount$velocityCount", $item.key))
      $util.qr($expressionValues.put(":valueCount$velocityCount", $item.value))
    #end
    #set( $expression = $expression.replaceAll("AND $", "") )
    #set( $query = {
    "expression": $expression,
    "expressionNames": $expressionNames,
    "expressionValues": $expressionValues
  } )
  #else
    #set( $query = {
    "expression": "id = :id",
    "expressionValues": {
        ":id": $util.parseJson($util.dynamodb.toDynamoDBJson($ctx.args.sessionId))
    }
  } )
  #end
  $util.qr($GetRequest.put("query", $query))
  #if( !$util.isNullOrEmpty($ctx.stash.authFilter) )
    $util.qr($GetRequest.put("filter", $util.parseJson($util.transform.toDynamoDBFilterExpression($ctx.stash.authFilter))))
  #end
  $util.toJson($GetRequest)
  ## [End] Get Request template. **
  `,
    `${parentName}.${fieldName}.verifySessionOwner.req.vtl`,
  );

  const res = MappingTemplate.s3MappingTemplateFromString(
    dedent`
  ## [Start] Get Response template. **
  #if( $ctx.error )
    $util.error($ctx.error.message, $ctx.error.type)
  #end
  #if( !$ctx.result.items.isEmpty() && $ctx.result.scannedCount == 1 )
    $util.toJson($ctx.result.items[0])
  #else
    #if( $ctx.result.items.isEmpty() && $ctx.result.scannedCount == 1 )
  $util.unauthorized()
    #end
    $util.toJson(null)
  #end
  ## [End] Get Response template. **
  `,
    `${parentName}.${fieldName}.verifySessionOwner.res.vtl`,
  );


  const jsReq = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    export function request(ctx) {
      return {};
    }
    `,
    `${parentName}.${fieldName}.verifySessionOwner.req.js`,
  )

  const jsRes = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    export function response(ctx) {
      return {};
    }
    `,
    `${parentName}.${fieldName}.verifySessionOwner.res.js`,
  )
  return { req: jsReq, res: jsRes}
  return { req, res };
};

// #endregion VerifySessionOwner Resolver

// #region WriteMessageToTable Resolver

const writeMessageToTableMappingTemplate = (
  parentName: string,
  fieldName: string,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.s3MappingTemplateFromString(
    dedent`
  ## [Start] Create Request template. **
  #set( $args = $util.defaultIfNull($ctx.stash.transformedArgs, $ctx.args) )
  ## Set the default values to put request **
  #set( $mergedValues = $util.defaultIfNull($ctx.stash.defaultValues, {}) )
  ## copy the values from input **
  $util.qr($mergedValues.putAll($util.defaultIfNull($args.input, {})))
  ## set the typename **
  $util.qr($mergedValues.put("__typename", "ConversationMessage${fieldName}"))
  $util.qr($mergedValues.put("sender", "user"))
  #set( $PutObject = {
    "version": "2018-05-29",
    "operation": "PutItem",
    "attributeValues":   $util.dynamodb.toMapValues($mergedValues),
    "condition": $condition
  } )
  #if( $args.condition )
    $util.qr($ctx.stash.conditions.add($args.condition))
  #end
  ## Begin - key condition **
  #if( $ctx.stash.metadata.modelObjectKey )
    #set( $keyConditionExpr = {} )
    #set( $keyConditionExprNames = {} )
    #foreach( $entry in $ctx.stash.metadata.modelObjectKey.entrySet() )
      $util.qr($keyConditionExpr.put("keyCondition$velocityCount", {
    "attributeExists": false
  }))
      $util.qr($keyConditionExprNames.put("#keyCondition$velocityCount", "$entry.key"))
    #end
    $util.qr($ctx.stash.conditions.add($keyConditionExpr))
  #else
    $util.qr($ctx.stash.conditions.add({
    "id": {
        "attributeExists": false
    }
  }))
  #end
  ## End - key condition **
  ## Start condition block **
  #if( $ctx.stash.conditions && $ctx.stash.conditions.size() != 0 )
    #set( $mergedConditions = {
    "and": $ctx.stash.conditions
  } )
    #set( $Conditions = $util.parseJson($util.transform.toDynamoDBConditionExpression($mergedConditions)) )
    #if( $Conditions.expressionValues && $Conditions.expressionValues.size() == 0 )
      #set( $Conditions = {
    "expression": $Conditions.expression,
    "expressionNames": $Conditions.expressionNames
  } )
    #end
    ## End condition block **
  #end
  #if( $Conditions )
    #if( $keyConditionExprNames )
      $util.qr($Conditions.expressionNames.putAll($keyConditionExprNames))
    #end
    $util.qr($PutObject.put("condition", $Conditions))
  #end
  #if( $ctx.stash.metadata.modelObjectKey )
    $util.qr($PutObject.put("key", $ctx.stash.metadata.modelObjectKey))
  #else
    #set( $Key = {
    "id":   $util.dynamodb.toDynamoDB($mergedValues.id)
  } )
    $util.qr($PutObject.put("key", $Key))
  #end
  $util.toJson($PutObject)
  ## [End] Create Request template. **
  `,
    `${parentName}.${fieldName}.writeMessageToTable.req.vtl`,
  );


  const jsReq = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    export function request(ctx) {
      return {};
    }
    `,
    `${parentName}.${fieldName}.writeMessageToTable.req.js`,
  )

  const jsRes = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    export function response(ctx) {
      return {};
    }
    `,
    `${parentName}.${fieldName}.writeMessageToTable.res.js`,
  )
  return { req: jsReq, res: jsRes}
  // return { req, res };
};
// #endregion WriteMessageToTable Resolver

// #region ReadHistory Resolver
const readHistoryMappingTemplate = (
  parentName: string,
  fieldName: string,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    #if( $ctx.stash.deniedField )
      #set( $result = {
      "items":   []
    } )
      #return($result)
    #end
    #set( $partitionKeyValue = $ctx.args.sessionId )
    #if( $util.isNull($partitionKeyValue) )
      #set( $result = {
      "items":   []
    } )
      #return($result)
    #else
      #set( $limit = $util.defaultIfNull($context.args.limit, 100) )
      #set( $query = {
      "expression": "#partitionKey = :partitionKey",
      "expressionNames": {
          "#partitionKey": "sessionId"
      },
      "expressionValues": {
          ":partitionKey": $util.dynamodb.toDynamoDB($partitionKeyValue)
      }
    } )
      #set( $args = $util.defaultIfNull($ctx.stash.transformedArgs, $ctx.args) )
      #if( !$util.isNullOrEmpty($ctx.stash.authFilter) )
        #set( $filter = $ctx.stash.authFilter )
        #if( !$util.isNullOrEmpty($args.filter) )
          #set( $filter = {
      "and":   [$filter, $args.filter]
    } )
        #end
      #else
        #if( !$util.isNullOrEmpty($args.filter) )
          #set( $filter = $args.filter )
        #end
      #end
      #if( !$util.isNullOrEmpty($filter) )
        #set( $filterExpression = $util.parseJson($util.transform.toDynamoDBFilterExpression($filter)) )
        #if( !$util.isNullOrBlank($filterExpression.expression) )
          #if( $filterExpression.expressionValues.size() == 0 )
            $util.qr($filterExpression.remove("expressionValues"))
          #end
          #set( $filter = $filterExpression )
        #end
      #end
    {
          "version": "2018-05-29",
          "operation": "Query",
          "query":     $util.toJson($query),
          "scanIndexForward":     #if( $context.args.sortDirection )
          #if( $context.args.sortDirection == "ASC" )
    true
          #else
    false
          #end
        #else
    true
        #end,
          "filter":     #if( $filter )
    $util.toJson($filter)
        #else
    null
        #end,
          "limit": $limit,
          "nextToken":     #if( $context.args.nextToken )
    $util.toJson($context.args.nextToken)
        #else
    null
        #end,
          "index": "gsi-ConversationSession${fieldName}.messages"
      }
    #end
    `,
    `${parentName}.${fieldName}.readHistory.req.vtl`,
  );

  const res = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    #if( $ctx.error )
    $util.error($ctx.error.message, $ctx.error.type)
    #else
      #if( !$result )
        #set( $result = $ctx.result )
      #end
      #if( $util.defaultIfNull($ctx.source.get("__operation"), null) == "Mutation" )
        #foreach( $item in $result.items )
          $util.qr($item.put("__operation", "Mutation"))
        #end
      #end
      $util.toJson($result)
    #end
      `,
    `${parentName}.${fieldName}.readHistory.res.vtl`,
  );

  const jsReq = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    export function request(ctx) {
      return {};
    }
    `,
    `${parentName}.${fieldName}.readHistory.req.js`,
  )

  const jsRes = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    export function response(ctx) {
      return {};
    }
    `,
    `${parentName}.${fieldName}.readHistory.res.js`,
  )
  return { req: jsReq, res: jsRes}
  return { req, res };
};

// #endregion ReadHistory Resolver

// #region InvokeLambda Resolver

const invokeLambdaMappingTemplate = (
  parentName: string,
  fieldName: string,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const req = MappingTemplate.s3MappingTemplateFromString(
    dedent`
    `,
    `${parentName}.${fieldName}.invokeLambda.req.vtl`,
  );

  const res = MappingTemplate.s3MappingTemplateFromString(
    dedent`

      `,
    `${parentName}.${fieldName}.invokeLambda.res.vtl`,
  );

  return { req, res };
};

// #endregion InvokeLambda Resolver

// #endregion Resolvers

// const initRequestMappingTemplate = MappingTemplate.s3MappingTemplateFromString(
//   dedent`
//   $util.qr($ctx.stash.put("defaultValues", $util.defaultIfNull($ctx.stash.defaultValues, {})))
//   $util.qr($ctx.stash.defaultValues.put("id", $util.autoId()))
//   #set( $createdAt = $util.time.nowISO8601() )
//   $util.qr($ctx.stash.defaultValues.put("createdAt", $createdAt))
//   $util.qr($ctx.stash.defaultValues.put("updatedAt", $createdAt))
//   $util.toJson({
//     "version": "2018-05-29",
//     "payload": {}
//   })
//   ## [End] Initialization default values. **
// `,
//   `${parentName}.${fieldName}.init.req.vtl`,
// );

// const initResponseMappingTemplate = MappingTemplate.s3MappingTemplateFromString(
//   dedent`
//   $util.toJson({})
// `,
//   `${parentName}.${fieldName}.init.res.vtl`,
// );

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
