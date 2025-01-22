import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { ArgumentNode, DirectiveNode, FieldDefinitionNode, StringValueNode } from 'graphql';
import { getBaseType } from 'graphql-transformer-common';
import { ValidateDirectiveConfiguration, ValidationType } from './types';

/**
 * Type guards for validation types
 */
const isNumericValidation = (type: ValidationType): boolean => {
  return ['gt', 'lt', 'gte', 'lte'].includes(type);
};

const isStringValidation = (type: ValidationType): boolean => {
  return ['minLength', 'maxLength', 'startsWith', 'endsWith', 'matches'].includes(type);
};

/**
 * A helper function to validate the string format of a length validation value.
 */
const isValidIntegerString = (str: string): boolean => {
  // Only allow 0 or positive integers (no -0, leading zeros, +, or scientific notation)
  return /^(?:0|[1-9]\d*)$/.test(str);
};

/**
 * Validates that length validation values (minLength, maxLength) are valid non-negative integers.
 */
const validateLengthValue = (config: ValidateDirectiveConfiguration): void => {
  if (config.type !== 'minLength' && config.type !== 'maxLength') {
    return;
  }

  const value = isValidIntegerString(config.value) ? parseInt(config.value, 10) : NaN;
  if (isNaN(value) || value < 0) {
    throw new InvalidDirectiveError(
      `${config.type} value must be a non-negative integer. Received '${config.value}' for field '${config.field.name.value}'`,
    );
  }
};

/**
 * Validates that the validation type is compatible with the field type.
 */
const validateTypeCompatibility = (field: FieldDefinitionNode, validationType: ValidationType): void => {
  const baseTypeName = getBaseType(field.type);

  if (isNumericValidation(validationType) && baseTypeName !== 'Int' && baseTypeName !== 'Float') {
    throw new InvalidDirectiveError(
      `Validation type '${validationType}' can only be used with numeric fields (Int, Float). Field '${field.name.value}' is of type '${baseTypeName}'`,
    );
  }

  if (isStringValidation(validationType) && baseTypeName !== 'String') {
    throw new InvalidDirectiveError(
      `Validation type '${validationType}' can only be used with String fields. Field '${field.name.value}' is of type '${baseTypeName}'`,
    );
  }
};

/**
 * Validates that there are no duplicate validation types on the same field.
 */
const validateNoDuplicateTypes = (field: FieldDefinitionNode, currentDirective: DirectiveNode, currentType: ValidationType): void => {
  for (const peerDirective of field.directives!) {
    if (peerDirective === currentDirective) {
      continue;
    }

    if (peerDirective.name.value === 'validate') {
      const peerType = (peerDirective.arguments!.find((arg: ArgumentNode) => arg.name.value === 'type')!.value as StringValueNode).value;
      if (peerType === currentType) {
        throw new InvalidDirectiveError(
          `Duplicate @validate directive with type '${currentType}' on field '${field.name.value}'. Each validation type can only be used once per field.`,
        );
      }
    }
  }
};

/**
 * Validates all aspects of the @validate directive configuration.
 */
export const validate = (definition: FieldDefinitionNode, directive: DirectiveNode, config: ValidateDirectiveConfiguration): void => {
  validateTypeCompatibility(definition, config.type as ValidationType);
  validateNoDuplicateTypes(definition, directive, config.type as ValidationType);
  validateLengthValue(config);
};
