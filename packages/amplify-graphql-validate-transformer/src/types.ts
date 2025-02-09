/* c8 ignore start */
import { ObjectTypeDefinitionNode, FieldDefinitionNode } from 'graphql';
/* c8 ignore end */

/**
 * Numeric validation types in an array
 */
/* c8 ignore start */
export const NUMERIC_VALIDATION_TYPES = ['gt', 'lt', 'gte', 'lte'] as const;
/* c8 ignore end */

/**
 * String validation types in an array
 */
/* c8 ignore start */
export const STRING_VALIDATION_TYPES = ['minLength', 'maxLength', 'startsWith', 'endsWith', 'matches'] as const;
/* c8 ignore end */

/**
 * All supported validation types in an array
 */
/* c8 ignore start */
export const VALIDATION_TYPES = [...NUMERIC_VALIDATION_TYPES, ...STRING_VALIDATION_TYPES] as const;
/* c8 ignore end */

/**
 * Numeric validations types in a string union
 */
/* c8 ignore start */
export type NumericValidationType = (typeof NUMERIC_VALIDATION_TYPES)[number];
/* c8 ignore end */

/**
 * String validations types in a string union
 */
/* c8 ignore start */
export type StringValidationType = (typeof STRING_VALIDATION_TYPES)[number];
/* c8 ignore end */

/**
 * All supported validation types in a string union
 */
/* c8 ignore start */
export type ValidationType = NumericValidationType | StringValidationType;
/* c8 ignore end */

/**
 * Interface for GraphQL schema `@validate` directive arguments
 */
/* c8 ignore start */
export interface ValidateDirectiveArgs {
  type: ValidationType;
  value: string;
  errorMessage: string;
}
/* c8 ignore end */

/**
 * Interface for internal validation rule configuration
 */
export interface ValidationRuleConfig {
  validationType: ValidationType;
  validationValue: string;
  errorMessage: string;
}

/**
 * Interface to store validate directive configurations
 */
/* c8 ignore start */
export interface ValidateDirectiveConfiguration extends ValidationRuleConfig {
  parentNode: ObjectTypeDefinitionNode;
  fieldNode: FieldDefinitionNode;
}
/* c8 ignore end */

/**
 * Map of field names to their validation configurations
 */
/* c8 ignore start */
export type ValidationsByField = {
  [fieldName: string]: ValidationRuleConfig[];
};
/* c8 ignore end */
