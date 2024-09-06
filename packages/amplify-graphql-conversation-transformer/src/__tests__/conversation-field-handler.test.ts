import { ConversationFieldHandler } from '../transformer-steps/conversation-field-handler';
import { DirectiveNode, FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';

describe('ConversationFieldHandler', () => {
  let handler: ConversationFieldHandler;
  let mockContext: TransformerSchemaVisitStepContextProvider;

  beforeEach(() => {
    handler = new ConversationFieldHandler();
    mockContext = {
      transformParameters: {},
    } as TransformerSchemaVisitStepContextProvider;
  });

  const createMockParent = (name: string): ObjectTypeDefinitionNode =>
    ({
      kind: 'ObjectTypeDefinition',
      name: { kind: 'Name', value: name },
    } as ObjectTypeDefinitionNode);

  const createMockField = (name: string, type: string): FieldDefinitionNode =>
    ({
      kind: 'FieldDefinition',
      name: { kind: 'Name', value: name },
      type: { kind: 'NamedType', name: { kind: 'Name', value: type } },
    } as FieldDefinitionNode);

  const createMockDirective = (args: Record<string, any> = {}): DirectiveNode =>
    ({
      kind: 'Directive',
      name: { kind: 'Name', value: 'conversation' },
      arguments: Object.entries(args).map(([name, value]) => ({
        kind: 'Argument',
        name: { kind: 'Name', value: name },
        value: { kind: 'StringValue', value },
      })),
    } as DirectiveNode);

  describe('getDirectiveConfig', () => {
    it('should throw an error if parent is not Mutation', () => {
      const parent = createMockParent('Query');
      const field = createMockField('testField', 'ConversationMessage');
      const directive = createMockDirective();

      expect(() => handler.getDirectiveConfig(parent, field, directive, mockContext)).toThrow(InvalidDirectiveError);
    });

    it('should return a valid configuration for a correct setup', () => {
      const parent = createMockParent('Mutation');
      const field = createMockField('testField', 'ConversationMessage');
      const directive = createMockDirective();

      const config = handler.getDirectiveConfig(parent, field, directive, mockContext);

      expect(config).toBeDefined();
      expect(config.messageModel).toBeDefined();
      expect(config.conversationModel).toBeDefined();
    });

    it('should throw an error if field type is not ConversationMessage', () => {
      const parent = createMockParent('Mutation');
      const field = createMockField('testField', 'String');
      const directive = createMockDirective();

      expect(() => handler.getDirectiveConfig(parent, field, directive, mockContext)).toThrow(InvalidDirectiveError);
    });
  });

  describe('createModels', () => {
    it('should create message and conversation models with correct names', () => {
      const parent = createMockParent('Mutation');
      const field = createMockField('testField', 'ConversationMessage');
      const directive = createMockDirective();

      const config = handler.getDirectiveConfig(parent, field, directive, mockContext);
      const { messageModel } = config.messageModel;
      const { conversationModel } = config.conversationModel;

      expect(messageModel.name.value).toBe('ConversationMessageTestField');
      expect(conversationModel.name.value).toBe('ConversationTestField');
    });
  });
});
