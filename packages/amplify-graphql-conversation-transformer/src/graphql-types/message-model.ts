import { BelongsToDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveNode,
  Kind,
  FieldDefinitionNode,
  ObjectTypeDefinitionNode,
  NamedTypeNode,
  InputValueDefinitionNode,
  InputObjectTypeDefinitionNode,
} from 'graphql';
import {
  makeDirective,
  makeArgument,
  makeValueNode,
  makeField,
  makeNamedType,
  wrapNonNull,
  makeListType,
  blankObject,
  makeInputValueDefinition,
  makeNonNullType,
} from 'graphql-transformer-common';

/**
 * Represents the structure of a conversation message model in the GraphQL schema.
 * @property {DirectiveNode} messageAuthDirective - The auth directive for the message model.
 * @property {DirectiveNode} messageModelDirective - The model directive for the message model.
 * @property {DirectiveNode} messageBelongsToConversationDirective - The belongs-to directive for the conversation relationship.
 * @property {FieldDefinitionNode} messageConversationField - The field definition for the conversation relationship.
 * @property {ObjectTypeDefinitionNode} messageModel - The complete message model object type definition.
 */
export type MessageModel = {
  messageAuthDirective: DirectiveNode;
  messageModelDirective: DirectiveNode;
  messageBelongsToConversationDirective: DirectiveNode;
  messageConversationField: FieldDefinitionNode;
  messageModel: ObjectTypeDefinitionNode;
  messageSubscription: FieldDefinitionNode;
  assistantMutationInput: InputObjectTypeDefinitionNode;
  assistantMutationField: FieldDefinitionNode;
  assistantStreamingMutationInput: InputObjectTypeDefinitionNode;
  assistantStreamingMutationField: FieldDefinitionNode;
};

/**
 * Creates a complete conversation message model structure for a GraphQL schema.
 * @param {string} messageModelName - The name of the message model.
 * @param {string} conversationModelName - The name of the conversation model.
 * @param {string} referenceFieldName - The name of the field referencing the conversation.
 * @param {NamedTypeNode} conversationMessageInterface - The interface that the message model implements.
 * @returns {MessageModel} The complete conversation message model structure.
 * @example
 * const messageModel = createMessageModel(
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
  conversationModelName: string,
  messageModelName: string,
  referenceFieldName: string,
  capitalizedFieldName: string,
  conversationMessageInterface: NamedTypeNode,
): MessageModel => {
  const messageSubscriptionFieldName = `onCreateAssistantResponse${capitalizedFieldName}`;
  const assistantMutationFieldName = `createAssistantResponse${capitalizedFieldName}`;
  const assistantStreamingMutationFieldName = `createAssistantResponseStream${capitalizedFieldName}`;

  const messageAuthDirective = constructMessageAuthDirective();
  const messageModelDirective = constructMessageModelDirective();
  const messageBelongsToConversationDirective = constructMessageSessionFieldBelongsToDirective(referenceFieldName);
  const messageConversationField = constructMessageSessionField(messageBelongsToConversationDirective, conversationModelName);
  const messageModel = constructConversationMessageModel(
    messageModelName,
    messageConversationField,
    referenceFieldName,
    [messageModelDirective, messageAuthDirective],
    conversationMessageInterface,
  );

  const messageSubscription = constructMessageSubscription(messageSubscriptionFieldName, [
    assistantStreamingMutationFieldName,
  ]);

  const assistantMutationInput = constructAssistantResponseMutationInput(messageModelName);
  const assistantMutationField = constructAssistantMutationField(
    assistantMutationFieldName,
    messageModelName,
    assistantMutationInput.name.value,
  );

  const assistantStreamingMutationInput = constructAssistantResponseStreamingMutationInput(messageModelName);
  const assistantStreamingMutationField = constructAssistantStreamingMutationField(
    assistantStreamingMutationFieldName,
    assistantStreamingMutationInput.name.value,
  );

  return {
    messageAuthDirective,
    messageModelDirective,
    messageBelongsToConversationDirective,
    messageConversationField,
    messageModel,
    messageSubscription,
    assistantMutationInput,
    assistantMutationField,
    assistantStreamingMutationInput,
    assistantStreamingMutationField,
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
const constructMessageSessionField = (belongsToDirective: DirectiveNode, typeName: string): FieldDefinitionNode => {
  return makeField('conversation', [], makeNamedType(typeName), [belongsToDirective]);
};

/**
 * Creates the complete message model object type definition.
 * @param {string} modelName - The name of the message model.
 * @param {FieldDefinitionNode} sessionField - The field definition for the conversation relationship.
 * @param {string} referenceFieldName - The name of the field referencing the conversation.
 * @param {DirectiveNode[]} typeDirectives - An array of directives to apply to the model.
 * @param {NamedTypeNode} conversationMessageInterface - The interface that the message model implements.
 * @returns {ObjectTypeDefinitionNode} The complete message model object type definition.
 * @example
 * const messageModel = makeConversationMessageModel(
 *   'Message',
 *   sessionField,
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
  sessionField: FieldDefinitionNode,
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
    fields: [id, conversationId, sessionField, role, content, context, uiComponents, associatedUserMessageId],
    directives: typeDirectives,
  };

  return object;
};

const constructMessageSubscription = (
  subscriptionName: string,
  onMutationNames: string[],
): FieldDefinitionNode => {
  const awsSubscribeDirective = makeDirective('aws_subscribe', [makeArgument('mutations', makeValueNode(onMutationNames))]);
  const cognitoAuthDirective = makeDirective('aws_cognito_user_pools', []);

  const args: InputValueDefinitionNode[] = [makeInputValueDefinition('conversationId', makeNamedType('ID'))];
  const subscriptionField = makeField(subscriptionName, args, makeNamedType(STREAM_RESPONSE_TYPE_NAME), [
    awsSubscribeDirective,
    cognitoAuthDirective,
  ]);

  return subscriptionField;
};

const constructAssistantMutationField = (fieldName: string, messageModelName: string, inputTypeName: string): FieldDefinitionNode => {
  const args = [makeInputValueDefinition('input', makeNonNullType(makeNamedType(inputTypeName)))];
  const cognitoAuthDirective = makeDirective('aws_cognito_user_pools', []);
  const createAssistantResponseMutation = makeField(fieldName, args, makeNamedType(messageModelName), [cognitoAuthDirective]);
  return createAssistantResponseMutation;
};

const constructAssistantResponseMutationInput = (messageModelName: string): InputObjectTypeDefinitionNode => {
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

const constructAssistantStreamingMutationField = (
  fieldName: string,
  inputTypeName: string,
): FieldDefinitionNode => {
  const args = [makeInputValueDefinition('input', makeNonNullType(makeNamedType(inputTypeName)))];
  const cognitoAuthDirective = makeDirective('aws_cognito_user_pools', []);
  const createAssistantResponseMutation = makeField(fieldName, args, makeNamedType(STREAM_RESPONSE_TYPE_NAME), [cognitoAuthDirective]);
  return createAssistantResponseMutation;
};

const constructAssistantResponseStreamingMutationInput = (messageModelName: string): InputObjectTypeDefinitionNode => {
  const inputName = `Create${messageModelName}AssistantStreamingInput`;
  return {
    kind: 'InputObjectTypeDefinition',
    name: { kind: 'Name', value: inputName },
    fields: [
      makeInputValueDefinition('conversationId', makeNonNullType(makeNamedType('ID'))),
      makeInputValueDefinition('associatedUserMessageId', makeNonNullType(makeNamedType('ID'))),
      makeInputValueDefinition('contentBlockIndex', makeNonNullType(makeNamedType('Int'))),

      makeInputValueDefinition('contentBlockText', makeNamedType('String')),
      makeInputValueDefinition('contentBlockDeltaIndex', makeNamedType('Int')),

      makeInputValueDefinition('contentBlockToolUse', makeNamedType('AWSJSON')),
      makeInputValueDefinition('contentBlockDoneAtIndex', makeNamedType('Int')),

      makeInputValueDefinition('stopReason', makeNamedType('String')),
    ],
  };
};

const STREAM_RESPONSE_TYPE_NAME = 'ConversationMessageStreamPart';

export const constructStreamResponseType = (): ObjectTypeDefinitionNode => {
  return {
    kind: 'ObjectTypeDefinition',
    name: { kind: 'Name', value: STREAM_RESPONSE_TYPE_NAME },
    fields: [
      makeField('id', [], makeNonNullType(makeNamedType('ID'))),
      makeField('owner', [], makeNamedType('String')),
      makeField('conversationId', [], makeNonNullType(makeNamedType('ID'))),
      makeField('associatedUserMessageId', [], makeNonNullType(makeNamedType('ID'))),

      makeField('contentBlockIndex', [], makeNonNullType(makeNamedType('Int'))),

      makeField('contentBlockText', [], makeNamedType('String')),
      makeField('contentBlockDeltaIndex', [], makeNamedType('Int')),

      makeField('contentBlockToolUse', [], makeNamedType('AWSJSON')),

      makeField('contentBlockDoneAtIndex', [], makeNamedType('Int')),

      makeField('stopReason', [], makeNamedType('String')),
    ],
  };
};
