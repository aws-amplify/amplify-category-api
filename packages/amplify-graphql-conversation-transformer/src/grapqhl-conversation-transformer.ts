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
} from '@aws-amplify/graphql-transformer-core';
import {
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
  wrapNonNull,
} from 'graphql-transformer-common';
import produce from 'immer';
import { WritableDraft, has } from 'immer/dist/internal';

export type ConversationDirectiveConfiguration = {
  parent: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  aiModel: string;
  // sessionModel: ObjectTypeDefinitionNode;
  // messagesModel: ObjectTypeDefinitionNode;
  field: FieldDefinitionNode;
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

        const referenceFieldName = 'conversationSessionId';

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

        draft.definitions.push(sessionModel as WritableDraft<ObjectTypeDefinitionNode>);
        draft.definitions.push(messageModel as WritableDraft<ObjectTypeDefinitionNode>);
      }
    });
    return document;
  };

  generateResolvers = (context: TransformerContextProvider): void => {
    console.log('>>> invokedGenerateResolvers');
    // console.log('context in generateResolvers', context);
  };

  prepare = (ctx: TransformerPrepareStepContextProvider): void => {
    // running this results in 'Conflicting enum type 'ConversationMessageSender' found.' from output.ts > addEnum
    ctx.output.addEnum(makeConversationEventSenderType());

    for (const directive of this.directives) {
      const sessionModelName = `ConversationSession${directive.field.name.value}`;
      const messageModelName = `ConversationMessage${directive.field.name.value}`;
      const referenceFieldName = 'conversationSessionId';

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
