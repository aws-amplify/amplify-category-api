/* c8 ignore start */
import { ObjectTypeDefinitionNode, FieldDefinitionNode } from 'graphql';
/* c8 ignore end */

// All supported validation types
/* c8 ignore start */
export const VALIDATION_TYPES = ['gt', 'lt', 'gte', 'lte', 'minLength', 'maxLength', 'startsWith', 'endsWith', 'matches'] as const;
export type ValidationType = (typeof VALIDATION_TYPES)[number];
/* c8 ignore end */

// Interface for directive arguments
/* c8 ignore start */
export interface ValidateArguments {
  type: ValidationType | '';
  value: string;
  errorMessage: string;
}
/* c8 ignore end */

// Interface to store validate directive configurations
/* c8 ignore start */
export interface ValidateDirectiveConfiguration extends ValidateArguments {
  object: ObjectTypeDefinitionNode;
  field: FieldDefinitionNode;
}
/* c8 ignore end */
