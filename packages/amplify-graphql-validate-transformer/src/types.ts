import { ObjectTypeDefinitionNode, FieldDefinitionNode } from 'graphql';

// Validation type groups
export const NUMERIC_VALIDATION_TYPES = ['gt', 'lt', 'gte', 'lte'] as const;
export const STRING_VALIDATION_TYPES = ['minLength', 'maxLength', 'startsWith', 'endsWith', 'matches'] as const;

// All supported validation types
export const VALIDATION_TYPES = [...NUMERIC_VALIDATION_TYPES, ...STRING_VALIDATION_TYPES] as const;
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
