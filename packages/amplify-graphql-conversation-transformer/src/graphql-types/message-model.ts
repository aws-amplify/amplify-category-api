import { BelongsToDirective } from '@aws-amplify/graphql-directives';
import { DirectiveNode, Kind, FieldDefinitionNode, ObjectTypeDefinitionNode, NamedTypeNode } from 'graphql';
import {
  makeDirective,
  makeArgument,
  makeValueNode,
  makeField,
  makeNamedType,
  wrapNonNull,
  makeListType,
  blankObject,
} from 'graphql-transformer-common';

export type MessageModel = {
  messageAuthDirective: DirectiveNode;
  messageModelDirective: DirectiveNode;
  messageBelongsToConversationDirective: DirectiveNode;
  messageConversationField: FieldDefinitionNode;
  messageModel: ObjectTypeDefinitionNode;
};

export const createMessageModel = (
  messageModelName: string,
  conversationModelName: string,
  referenceFieldName: string,
  conversationMessageInterface: NamedTypeNode,
): MessageModel => {
  const messageAuthDirective = createMessageAuthDirective();
  const messageModelDirective = createMessageModelDirective();
  const messageBelongsToConversationDirective = createMessageSessionFieldBelongsToDirective(referenceFieldName);
  const messageConversationField = createMessageSessionField(messageBelongsToConversationDirective, conversationModelName);
  const messageModel = makeConversationMessageModel(messageModelName, messageConversationField, referenceFieldName, [
    messageModelDirective,
    messageAuthDirective,
  ],
  conversationMessageInterface
);

  return {
    messageAuthDirective,
    messageModelDirective,
    messageBelongsToConversationDirective,
    messageConversationField,
    messageModel,
  };
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
  return makeField('conversation', [], makeNamedType(typeName), [belongsToDirective]);
};

const makeConversationMessageModel = (
  modelName: string,
  sessionField: FieldDefinitionNode,
  referenceFieldName: string,
  typeDirectives: DirectiveNode[],
  conversationMessageInterface: NamedTypeNode,
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
      role: ConversationEventSenderType! // "user" | "assistant"
      message: String!
      context: AWSJSON
      uiComponents: [AWSJSON]
    }
    */

  // fields
  const id = makeField('id', [], wrapNonNull(makeNamedType('ID')));
  const conversationId = makeField(referenceFieldName, [], wrapNonNull(makeNamedType('ID')));
  const role = makeField('role', [], makeNamedType('ConversationParticipantRole'));
  const content = makeField('content', [], makeListType(makeNamedType('ContentBlock')));
  const context = makeField('context', [], makeNamedType('AWSJSON'));
  const uiComponents = makeField('uiComponents', [], makeListType(makeNamedType('AWSJSON')));
  const assistantContent = makeField('assistantContent', [], makeNamedType('String'));

  const object = {
    ...blankObject(modelName),
    interfaces: [conversationMessageInterface],
    fields: [id, conversationId, sessionField, role, content, context, uiComponents, assistantContent],
    directives: typeDirectives,
  };

  return object;
};
