import { BelongsToDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  Kind,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
} from 'graphql';
import {
  blankObject,
  makeArgument,
  makeDirective,
  makeField,
  makeInputValueDefinition,
  makeListType,
  makeNamedType,
  makeNonNullType,
  makeValueNode,
  wrapNonNull,
} from 'graphql-transformer-common';

/**
 * Represents the structure of a conversation message model in the GraphQL schema.
 * @property {DirectiveNode} messageAuthDirective - The auth directive for the message model.
 * @property {DirectiveNode} messageDirective - The model directive for the message model.
 * @property {DirectiveNode} messageBelongsToConversationDirective - The belongs-to directive for the conversation relationship.
 * @property {FieldDefinitionNode} messageConversationField - The field definition for the conversation relationship.
 * @property {ObjectTypeDefinitionNode} model - The complete message model object type definition.
 */
export type MessageModel = {
  authDirective: DirectiveNode;
  modelDirective: DirectiveNode;
  belongsToConversationDirective: DirectiveNode;
  conversationField: FieldDefinitionNode;
  model: ObjectTypeDefinitionNode;
};

/**
 * Creates a complete conversation message model structure for a GraphQL schema.
 * @param {string} messageName - The name of the message model.
 * @param {string} conversationName - The name of the conversation model.
 * @param {string} referenceFieldName - The name of the field referencing the conversation.
 * @param {NamedTypeNode} conversationMessageInterface - The interface that the message model implements.
 * @returns {MessageModel} The complete conversation message model structure.
 * @example
 * const message = createMessageModel(
 *   'Message',
 *   'Conversation',
 *   'conversationId',
 *   { kind: 'NamedType', name: { kind: 'Name', value: 'ConversationMessage' } }
 * );
 *
 * // This will generate a GraphQL type:
 * // type Message implements ConversationMessage \`@model\`(subscriptions: { onUpdate: null, onDelete: null }, mutations: { update: null }) \`@auth\`(...) {
 * //   id: ID!
 * //   conversationId: ID!
 * //   conversation: Conversation `@belongsTo`(references: "conversationId")
 * //   role: ConversationParticipantRole
 * //   content: [ContentBlock]
 * //   aiContext: AWSJSON
 * //   toolConfiguration: ToolConfiguration
 * //   assistantContent: [ContentBlock]
 * // }
 */
export const createMessageModel = (
  conversationName: string,
  messageName: string,
  referenceFieldName: string,
  conversationMessageInterface: NamedTypeNode,
): MessageModel => {
  const authDirective = constructMessageAuthDirective();
  const modelDirective = constructMessageModelDirective();
  const belongsToConversationDirective = constructMessageSessionFieldBelongsToDirective(referenceFieldName);
  const conversationField = constructMessageConversationField(belongsToConversationDirective, conversationName);
  const model = constructConversationMessageModel(
    messageName,
    conversationField,
    referenceFieldName,
    [modelDirective, authDirective],
    conversationMessageInterface,
  );

  return {
    authDirective,
    modelDirective,
    belongsToConversationDirective,
    conversationField,
    model,
  };
};

export const createMessageSubscription = (
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

export const createAssistantMutationField = (fieldName: string, messageName: string, inputTypeName: string): FieldDefinitionNode => {
  const args = [makeInputValueDefinition('input', makeNonNullType(makeNamedType(inputTypeName)))];
  const cognitoAuthDirective = makeDirective('aws_cognito_user_pools', []);
  const createAssistantResponseMutation = makeField(fieldName, args, makeNamedType(messageName), [cognitoAuthDirective]);
  return createAssistantResponseMutation;
};

export const createAssistantResponseMutationInput = (messageName: string): InputObjectTypeDefinitionNode => {
  const inputName = `Create${messageName}AssistantInput`;
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

/**
 * Creates a model directive for the message model.
 * @returns {DirectiveNode} The model directive node.
 * @example
 * const modelDirective = constructMessageModelDirective();
 * // This will generate a directive like:
 * // `@model`(subscriptions: { onUpdate: null, onDelete: null }, mutations: { update: null })
 */
const constructMessageModelDirective = (): DirectiveNode => {
  return makeDirective('model', [
    makeArgument('subscriptions', makeValueNode({ onUpdate: null, onDelete: null })),
    makeArgument('mutations', makeValueNode({ update: null })),
  ]);
};

/**
 * Creates an auth directive for the message model.
 * @returns {DirectiveNode} The auth directive node.
 * @example
 * const authDirective = constructMessageAuthDirective();
 * // This will generate a directive like:
 * // `@auth`(rules: [{ allow: owner, ownerField: "owner" }])
 */
const constructMessageAuthDirective = (): DirectiveNode => {
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

/**
 * Creates a belongs-to directive for the conversation relationship in the message model.
 * @param {string} referenceFieldName - The name of the field referencing the conversation.
 * @returns {DirectiveNode} The belongs-to directive node.
 * @example
 * const belongsToDirective = constructMessageSessionFieldBelongsToDirective('conversationId');
 * // This will generate a directive like:
 * // `@belongsTo`(references: "conversationId")
 */
const constructMessageSessionFieldBelongsToDirective = (referenceFieldName: string): DirectiveNode => {
  const referencesArg = makeArgument('references', makeValueNode(referenceFieldName));
  return makeDirective(BelongsToDirective.name, [referencesArg]);
};

/**
 * Creates a field definition for the conversation relationship in the message model.
 * @param {DirectiveNode} belongsToDirective - The belongs-to directive for the field.
 * @param {string} typeName - The name of the conversation type.
 * @returns {FieldDefinitionNode} The field definition node.
 * @example
 * const conversationField = constructMessageSessionField(belongsToDirective, 'Conversation');
 * // This will generate a field definition like:
 * // conversation: Conversation `@belongsTo`(references: "conversationId")
 */
const constructMessageConversationField = (belongsToDirective: DirectiveNode, typeName: string): FieldDefinitionNode => {
  return makeField('conversation', [], makeNamedType(typeName), [belongsToDirective]);
};

/**
 * Creates the complete message model object type definition.
 * @param {string} modelName - The name of the message model.
 * @param {FieldDefinitionNode} conversationField - The field definition for the conversation relationship.
 * @param {string} referenceFieldName - The name of the field referencing the conversation.
 * @param {DirectiveNode[]} typeDirectives - An array of directives to apply to the model.
 * @param {NamedTypeNode} conversationMessageInterface - The interface that the message model implements.
 * @returns {ObjectTypeDefinitionNode} The complete message model object type definition.
 * @example
 * const message = makeConversationMessageModel(
 *   'Message',
 *   conversationField,
 *   'conversationId',
 *   [modelDirective, authDirective],
 *   { kind: 'NamedType', name: { kind: 'Name', value: 'ConversationMessage' } }
 * );
 * // This will generate a GraphQL type definition like:
 * // type Message implements ConversationMessage @model(...) @auth(...) {
 * //   id: ID!
 * //   conversationId: ID!
 * //   conversation: Conversation @belongsTo(references: "conversationId")
 * //   role: ConversationParticipantRole
 * //   content: [ContentBlock]
 * //   aiContext: AWSJSON
 * //   toolConfiguration: ToolConfiguration
 * //   assistantContent: [ContentBlock]
 * // }
 */
const constructConversationMessageModel = (
  modelName: string,
  conversationField: FieldDefinitionNode,
  referenceFieldName: string,
  typeDirectives: DirectiveNode[],
  conversationMessageInterface: NamedTypeNode,
): ObjectTypeDefinitionNode => {
  const id = makeField('id', [], wrapNonNull(makeNamedType('ID')));
  const conversationId = makeField(referenceFieldName, [], wrapNonNull(makeNamedType('ID')));
  const role = makeField('role', [], makeNamedType('ConversationParticipantRole'));
  const content = makeField('content', [], makeListType(makeNamedType('ContentBlock')));
  const context = makeField('aiContext', [], makeNamedType('AWSJSON'));
  const uiComponents = makeField('toolConfiguration', [], makeNamedType('ToolConfiguration'));
  const associatedUserMessageId = makeField('associatedUserMessageId', [], makeNamedType('ID'));

  const object = {
    ...blankObject(modelName),
    interfaces: [conversationMessageInterface],
    fields: [id, conversationId, conversationField, role, content, context, uiComponents, associatedUserMessageId],
    directives: typeDirectives,
  };

  return object;
};
