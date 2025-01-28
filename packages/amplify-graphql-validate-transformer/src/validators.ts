import { ArgumentNode, DirectiveNode, FieldDefinitionNode, ObjectTypeDefinitionNode, StringValueNode } from 'graphql';
import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { getBaseType, isListType } from 'graphql-transformer-common';
import { NUMERIC_VALIDATION_TYPES, STRING_VALIDATION_TYPES, ValidateDirectiveConfiguration, ValidationType } from './types';

/**
 * Validates all aspects of the `@validate` directive configuration, including:
 * - The field is inside a model type.
 * - The field is not a list field.
 * - There are no duplicate validation types on the same field.
 * - The field type is compatible with the validation type.
 * - For length validation, the value is a valid non-negative integer.
 * - For numeric validation, the value is a valid number.
 *
 * @param parentNode - The object type definition node that contains the field
 * @param fieldNode - The field definition node that the directive is applied to
 * @param directive - The `@validate` directive node applied to the field
 * @param config - The configuration object containing the validation rules and metadata
 */
export const validate = (
  parentNode: ObjectTypeDefinitionNode,
  fieldNode: FieldDefinitionNode,
  directive: DirectiveNode,
  config: ValidateDirectiveConfiguration,
): void => {
  validateModelType(parentNode);
  validateNoListFieldValidation(fieldNode);
  validateOrderingWithDefaultDirective(fieldNode, directive);
  validateNoDuplicateTypes(fieldNode, directive, config.type as ValidationType);
  validateTypeCompatibility(fieldNode, config.type as ValidationType);

  if (isLengthValidation(config.type as ValidationType)) {
    validateLengthValue(config);
  }

  if (isNumericValidation(config.type as ValidationType)) {
    validateNumericValue(config);
  }
};

/**
 * Validates that the field is inside a model type.
 * @param parentNode - The object type definition node that contains the field
 */
const validateModelType = (parentNode: ObjectTypeDefinitionNode): void => {
  if (!parentNode.directives!.find((d) => d.name.value === 'model')) {
    throw new InvalidDirectiveError('@validate directive can only be used on fields within @model types.');
  }
};

/**
 * Validates that the field is not a list field.
 * @param fieldNode - The field definition node that the directive is applied to
 */
const validateNoListFieldValidation = (fieldNode: FieldDefinitionNode): void => {
  if (isListType(fieldNode.type)) {
    throw new InvalidDirectiveError(`@validate directive cannot be used on list field '${fieldNode.name.value}'`);
  }
};

/**
 * Validates that `@validate` directive is not placed before a `@default` directive.
 * @param fieldNode - The field definition node that the directive is applied to
 * @param currentDirective - The current `@validate` directive node
 */
const validateOrderingWithDefaultDirective = (fieldNode: FieldDefinitionNode, currentDirective: DirectiveNode): void => {
  const directives = fieldNode.directives!;
  const validateIndex = directives.indexOf(currentDirective);
  const defaultDirective = directives.find((d) => d.name.value === 'default');

  if (defaultDirective) {
    const defaultIndex = directives.indexOf(defaultDirective);
    if (validateIndex < defaultIndex) {
      throw new InvalidDirectiveError('@validate directive must be specified after @default directive');
    }
  }
};

/**
 * Validates that there are no duplicate validation types on the same field.
 * @param fieldNode - The field definition node that the directive is applied to
 * @param currentDirective - The current `@validate` directive node
 * @param currentType - The current validation type
 */
const validateNoDuplicateTypes = (fieldNode: FieldDefinitionNode, currentDirective: DirectiveNode, currentType: ValidationType): void => {
  for (const peerDirective of fieldNode.directives!) {
    if (peerDirective === currentDirective) {
      continue;
    }

    if (peerDirective.name.value === 'validate') {
      const peerType = (peerDirective.arguments!.find((arg: ArgumentNode) => arg.name.value === 'type')!.value as StringValueNode).value;
      if (peerType === currentType) {
        throw new InvalidDirectiveError(
          `Duplicate @validate directive with type '${currentType}' on field '${fieldNode.name.value}'. Each validation type can only be used once per field.`,
        );
      }
    }
  }
};

/**
 * Validates that the field type is compatible with the validation type.
 * @param fieldNode - The field definition node that the directive is applied to
 * @param validationType - The validation type to validate against
 */
const validateTypeCompatibility = (fieldNode: FieldDefinitionNode, validationType: ValidationType): void => {
  const baseType = getBaseType(fieldNode.type);

  if (isNumericValidation(validationType) && baseType !== 'Int' && baseType !== 'Float') {
    throw new InvalidDirectiveError(
      `Validation type '${validationType}' can only be used with numeric fields (Int, Float). Field '${fieldNode.name.value}' is of type '${baseType}'`,
    );
  }

  if (isStringValidation(validationType) && baseType !== 'String') {
    throw new InvalidDirectiveError(
      `Validation type '${validationType}' can only be used with 'String' fields. Field '${fieldNode.name.value}' is of type '${baseType}'`,
    );
  }
};

/**
 * Validates that length validation values (minLength, maxLength) are valid non-negative integers.
 * @param config - The configuration object containing the validation rules and metadata
 */
const validateLengthValue = (config: ValidateDirectiveConfiguration): void => {
  const value = parseInt(config.value);
  if (isNaN(value) || value < 0) {
    throw new InvalidDirectiveError(
      `${config.type} value must be a non-negative integer. Received '${config.value}' for field '${config.fieldNode.name.value}'`,
    );
  }
};

/**
 * Validates that the numeric validation type value is a valid number.
 * @param config - The configuration object containing the validation rules and metadata
 */
const validateNumericValue = (config: ValidateDirectiveConfiguration): void => {
  const value = parseFloat(config.value);
  if (isNaN(value)) {
    throw new InvalidDirectiveError(
      `${config.type} value must be a number. Received '${config.value}' for field '${config.fieldNode.name.value}'`,
    );
  }
};

/**
 * Checks if the validation type is a numeric validation type.
 * @param type - The validation type to check
 * @returns True if the validation type is a numeric validation type, false otherwise
 */
const isNumericValidation = (type: ValidationType): boolean => {
  return (NUMERIC_VALIDATION_TYPES as readonly ValidationType[]).includes(type);
};

/**
 * Checks if the validation type is a string validation type.
 * @param type - The validation type to check
 * @returns True if the validation type is a string validation type, false otherwise
 */
const isStringValidation = (type: ValidationType): boolean => {
  return (STRING_VALIDATION_TYPES as readonly ValidationType[]).includes(type);
};

/**
 * Checks if the validation type is a length validation type.
 * @param type - The validation type to check
 * @returns True if the validation type is a length validation type, false otherwise
 */
const isLengthValidation = (type: ValidationType): boolean => {
  return ['minLength', 'maxLength'].includes(type);
};
