import { HasManyDirective } from '@aws-amplify/graphql-directives';
import { DirectiveNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode, ObjectValueNode } from 'graphql';
import {
  blankObject,
  makeArgument,
  makeDirective,
  makeField,
  makeListType,
  makeNamedType,
  makeValueNode,
  wrapNonNull,
} from 'graphql-transformer-common';

/**
 * Represents the structure of a conversation model in the GraphQL schema.
 * @property {DirectiveNode} authDirective - The auth directive for the conversation model.
 * @property {DirectiveNode} modelDirective - The model directive for the conversation model.
 * @property {DirectiveNode} hasManyMessagesDirective - The has-many directive for the messages relationship.
 * @property {FieldDefinitionNode} messagesField - The field definition for the messages relationship.
 * @property {ObjectTypeDefinitionNode} model - The complete conversation model object type definition.
 */
export type ConversationModel = {
  authDirective: DirectiveNode;
  modelDirective: DirectiveNode;
  hasManyMessagesDirective: DirectiveNode;
  messagesField: FieldDefinitionNode;
  model: ObjectTypeDefinitionNode;
};

/**
 * Creates a complete conversation model structure for a GraphQL schema.
 * @param {string} conversationName - The name of the conversation model.
 * @param {string} messageName - The name of the message model.
 * @param {string} referenceFieldName - The name of the field referencing the conversation in the message model.
 * @returns {ConversationModel} The complete conversation model structure.
 * @example
 * const conversation = createConversationModel(
 *   'Conversation',
 *   'Message',
 *   'conversationId'
 * );
 *
 * // This will generate a GraphQL type:
 * // type Conversation @model @auth(rules: [{ allow: owner, ownerField: "owner" }]) {
 * //   id: ID!
 * //   messages: [Message] @hasMany(references: ["conversationId"])
 * //   owner: String
 * // }
 */
export const createConversationModel = (conversationName: string, messageName: string, referenceFieldName: string): ConversationModel => {
  const authDirective = createConversationAuthDirective();
  const modelDirective = createConversationModelDirective();
  const hasManyMessagesDirective = createConversationModelMessagesFieldHasManyDirective(referenceFieldName);
  const messagesField = createConversationModelMessagesField(hasManyMessagesDirective, messageName);
  const model = makeConversationModel(conversationName, messagesField, [authDirective, modelDirective]);

  return {
    authDirective,
    modelDirective,
    hasManyMessagesDirective,
    messagesField,
    model,
  };
};

/**
 * Creates an auth directive for the conversation model.
 * @returns {DirectiveNode} The auth directive node.
 * @example
 * const authDirective = createSessionAuthDirective();
 * // This will generate a directive like:
 * // @auth(rules: [{ allow: owner, ownerField: "owner" }])
 */
const createConversationAuthDirective = (): DirectiveNode => {
  const rules = makeArgument('rules', {
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
  });

  return makeDirective('auth', [rules]);
};

/**
 * Creates a model directive for the conversation model.
 * @returns {DirectiveNode} The model directive node.
 * @example
 * const modelDirective = createSessionModelDirective();
 * // This will generate a directive like:
 * // @model(subscriptions: { level: off }, mutations: { update: null })
 */
const createConversationModelDirective = (): DirectiveNode => {
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

/**
 * Creates a has-many directive for the messages relationship in the conversation model.
 * @param {string} fieldName - The name of the field referencing the conversation in the message model.
 * @returns {DirectiveNode} The has-many directive node.
 * @example
 * const hasManyDirective = createSessionModelMessagesFieldHasManyDirective('conversationId');
 * // This will generate a directive like:
 * // @hasMany(references: ["conversationId"])
 */
const createConversationModelMessagesFieldHasManyDirective = (fieldName: string): DirectiveNode => {
  const referencesArg = makeArgument('references', makeValueNode(fieldName));
  return makeDirective(HasManyDirective.name, [referencesArg]);
};

/**
 * Creates a field definition for the messages relationship in the conversation model.
 * @param {DirectiveNode} hasManyDirective - The has-many directive for the field.
 * @param {string} typeName - The name of the message type.
 * @returns {FieldDefinitionNode} The field definition node.
 * @example
 * const messagesField = createSessionModelMessagesField(hasManyDirective, 'Message');
 * // This will generate a field definition like:
 * // messages: [Message] @hasMany(references: ["conversationId"])
 */
const createConversationModelMessagesField = (hasManyDirective: DirectiveNode, typeName: string): FieldDefinitionNode => {
  return makeField('messages', [], makeListType(makeNamedType(typeName)), [hasManyDirective]);
};

/**
 * Creates the complete conversation model object type definition.
 * @param {string} modelName - The name of the conversation model.
 * @param {FieldDefinitionNode} messagesField - The field definition for the messages relationship.
 * @param {DirectiveNode[]} typeDirectives - An array of directives to apply to the model.
 * @returns {ObjectTypeDefinitionNode} The complete conversation model object type definition.
 * @example
 * const conversation = makeConversationModel(
 *   'Conversation',
 *   messagesField,
 *   [authDirective, modelDirective]
 * );
 * // This will generate a GraphQL type definition like:
 * // type Conversation @model @auth(rules: [{ allow: owner, ownerField: "owner" }]) {
 * //   id: ID!
 * //   name: String
 * //   metadata: AWSJSON
 * //   messages: [Message] @hasMany(references: ["conversationId"])
 * //   owner: String
 * // }
 */
const makeConversationModel = (
  modelName: string,
  messagesField: FieldDefinitionNode,
  typeLevelDirectives: DirectiveNode[],
): ObjectTypeDefinitionNode => {
  const id = makeField('id', [], wrapNonNull(makeNamedType('ID')));
  const name = makeField('name', [], makeNamedType('String'));
  const metadata = makeField('metadata', [], makeNamedType('AWSJSON'));

  return {
    ...blankObject(modelName),
    fields: [id, name, metadata, messagesField],
    directives: typeLevelDirectives,
  };
};
