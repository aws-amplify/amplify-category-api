import { BelongsToDirective, ConversationDirective, HasManyDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveWrapper,
  InvalidDirectiveError,
  TransformerPluginBase,
  generateGetArgumentsInput,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPreProcessContextProvider,
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
import { WritableDraft } from 'immer/dist/internal';

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

  constructor() {
    super('amplify-conversation-transformer', ConversationDirective.definition);
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
    const mutationObjectContainingConversationDirectives = ctx.inputDocument.definitions.filter((definition) =>
      definition.kind === 'ObjectTypeDefinition' &&
      definition.name.value === 'Mutation' &&
      definition.fields?.filter(
        (mutationFields) => mutationFields.directives?.filter(
          (directive) => directive.name.value === ConversationDirective.name)
        )
    ) as ObjectTypeDefinitionNode[];

    const conversationDirectiveFields = mutationObjectContainingConversationDirectives[0].fields
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

        const sessionModel = makeConversationSessionModel(sessionModelName, messageModelName, 'conversationSessionId');
        const messagesModel = makeConversationMessageModel(messageModelName, sessionModel);

        draft.definitions.push(sessionModel as WritableDraft<ObjectTypeDefinitionNode>);
        draft.definitions.push(messagesModel as WritableDraft<ObjectTypeDefinitionNode>);
      }
    });
    return document;
  };

  generateResolvers = (context: TransformerContextProvider): void => {
    console.log('>>> invokedGenerateResolvers');
    // console.log('context in generateResolvers', context);
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

const makeConversationSessionModel = (
  modelName: string,
  messageModelName: string,
  referenceFieldName: string,
): ObjectTypeDefinitionNode => {
  /*
    type ConversationSession_pirateChat
    @model
    @auth(rules: [{allow: owner, ownerField: "owner"}])
    {
        events: [ConversationMessage_pirateChat] @hasMany(references: "conversationSessionId")
    }
  */

  // model directives

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
  const modelDirective = makeDirective('model', [
    makeArgument('subscriptions', subscriptionsOffValue),
    makeArgument('mutations', makeValueNode({ update: null })),
  ]);

  // const authDirective = makeDirective('auth', [makeArgument('rules', makeValueNode([{ allow: 'owner', ownerField: 'owner' }]))]);

  const authDirective = makeDirective('auth', [
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

  // field directives
  const referencesArg = makeArgument('references', makeValueNode(referenceFieldName));
  const hasManyDirective = makeDirective(HasManyDirective.name, [referencesArg]);

  // fields
  const id = makeField('id', [], wrapNonNull(makeNamedType('ID')));
  const name = makeField('name', [], makeNamedType('String'));
  const metadata = makeField('metadata', [], makeNamedType('AWSJSON'));
  const messages = makeField('messages', [], makeListType(makeNamedType(messageModelName)), [hasManyDirective]);

  const object = {
    ...blankObject(modelName),
    fields: [id, name, metadata, messages],
    directives: [modelDirective, authDirective],
  };
  return object;
};

const makeConversationMessageModel = (modelName: string, sessionModel: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode => {
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
  const modelDirective = makeDirective('model', [
    makeArgument('subscriptions', makeValueNode({ onUpdate: null, onDelete: null })),
    makeArgument('mutations', makeValueNode({ update: null })),
  ]);

  const authDirective = makeDirective('auth', [
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

  // field directives
  const makeBelongsToDirective = (referenceField: FieldDefinitionNode): DirectiveNode => {
    const referencesArg = makeArgument('references', makeValueNode(referenceField.name.value));
    return makeDirective(BelongsToDirective.name, [referencesArg]);
  };

  // fields
  const id = makeField('id', [], wrapNonNull(makeNamedType('ID')));
  const conversationSessionId = makeField('conversationSessionId', [], wrapNonNull(makeNamedType('ID')));
  const session = makeField('session', [], makeNamedType(sessionModel.name.value), [makeBelongsToDirective(conversationSessionId)]);
  const sender = makeField('sender', [], makeNamedType('ConversationMessageSender'));
  const content = makeField('content', [], makeNamedType('String'));
  const context = makeField('context', [], makeNamedType('AWSJSON'));
  const uiComponents = makeField('uiComponents', [], makeListType(makeNamedType('AWSJSON')));

  const object = {
    ...blankObject(modelName),
    fields: [id, conversationSessionId, session, sender, content, context, uiComponents],
    directives: [modelDirective, authDirective],
  };

  return object;
};
