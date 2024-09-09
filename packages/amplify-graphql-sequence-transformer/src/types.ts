import { DirectiveNode, FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';

export type SequenceDirectiveConfiguration = {
  object: ObjectTypeDefinitionNode;
  field: FieldDefinitionNode;
  directive: DirectiveNode;
  modelDirective: DirectiveNode;
};
