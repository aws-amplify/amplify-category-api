import { HasManyDirective } from '@aws-amplify/graphql-directives';
import { DirectiveNode, Kind, ObjectValueNode, FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import {
    makeDirective,
    makeArgument,
    makeValueNode,
    makeField,
    makeListType,
    makeNamedType,
    wrapNonNull,
    blankObject,
} from 'graphql-transformer-common';

export type ConversationModel = {
  conversationAuthDirective: DirectiveNode;
  conversationModelDirective: DirectiveNode;
  conversationHasManyMessagesDirective: DirectiveNode;
  conversationMessagesField: FieldDefinitionNode;
  conversationModel: ObjectTypeDefinitionNode;
};

export const createConversationModel = (
  conversationModelName: string,
  messageModelName: string,
  referenceFieldName: string,
): ConversationModel => {
  const conversationAuthDirective = createSessionAuthDirective();
  const conversationModelDirective = createSessionModelDirective();
  const conversationHasManyMessagesDirective = createSessionModelMessagesFieldHasManyDirective(referenceFieldName);
  const conversationMessagesField = createSessionModelMessagesField(conversationHasManyMessagesDirective, messageModelName);
  const conversationModel = makeConversationSessionModel(conversationModelName, conversationMessagesField, [conversationAuthDirective, conversationModelDirective]);

  return {
    conversationAuthDirective,
    conversationModelDirective,
    conversationHasManyMessagesDirective,
    conversationMessagesField,
    conversationModel,
  };
};

const createSessionAuthDirective = (): DirectiveNode => {
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
  const id = makeField('id', [], wrapNonNull(makeNamedType('ID')));
  const name = makeField('name', [], makeNamedType('String'));
  const metadata = makeField('metadata', [], makeNamedType('AWSJSON'));

  return {
    ...blankObject(modelName),
    fields: [id, name, metadata, messagesField],
    directives: typeLevelDirectives,
  };
};
