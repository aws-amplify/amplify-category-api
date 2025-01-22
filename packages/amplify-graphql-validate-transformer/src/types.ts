import { ObjectTypeDefinitionNode, FieldDefinitionNode } from 'graphql';

// All supported validation types
export const VALIDATION_TYPES = ['gt', 'lt', 'gte', 'lte', 'minLength', 'maxLength', 'startsWith', 'endsWith', 'matches'] as const;
export type ValidationType = (typeof VALIDATION_TYPES)[number];

// Interface for directive arguments
export interface ValidateArguments {
  type: ValidationType | '';
  value: string;
  errorMessage: string;
}

// Interface to store validate directive configurations
export interface ValidateDirectiveConfiguration extends ValidateArguments {
  object: ObjectTypeDefinitionNode;
  field: FieldDefinitionNode;
}
