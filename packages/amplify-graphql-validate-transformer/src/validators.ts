import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { ArgumentNode, DirectiveNode, FieldDefinitionNode, StringValueNode } from 'graphql';
import { getBaseType, isListType } from 'graphql-transformer-common';
import { NUMERIC_VALIDATION_TYPES, STRING_VALIDATION_TYPES, ValidateDirectiveConfiguration, ValidationType } from './types';

/**
 * Validates all aspects of the @validate directive configuration.
 */
export const validate = (definition: FieldDefinitionNode, directive: DirectiveNode, config: ValidateDirectiveConfiguration): void => {
  validateNoListFieldValidation(definition);
  validateNoDuplicateTypes(definition, directive, config.type as ValidationType);
  validateTypeCompatibility(definition, config.type as ValidationType);

  if (isLengthValidation(config.type as ValidationType)) {
    validateLengthValue(config);
  }

  if (isNumericValidation(config.type as ValidationType)) {
    validateNumericValue(config);
  }
};

/**
 * Validates that the field is not a list field.
 */
const validateNoListFieldValidation = (field: FieldDefinitionNode): void => {
  if (isListType(field.type)) {
    throw new InvalidDirectiveError(`Validation directive cannot be used on list field '${field.name.value}'`);
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
 * Validates that length validation values (minLength, maxLength) are valid non-negative integers.
 */
const validateLengthValue = (config: ValidateDirectiveConfiguration): void => {
  const value = parseInt(config.value);
  if (isNaN(value) || value < 0) {
    throw new InvalidDirectiveError(
      `${config.type} value must be a non-negative integer. Received '${config.value}' for field '${config.field.name.value}'`,
    );
  }
};

/**
 * Validates that the numeric validation type value is a valid number.
 */
const validateNumericValue = (config: ValidateDirectiveConfiguration): void => {
  const value = parseFloat(config.value);
  if (isNaN(value)) {
    throw new InvalidDirectiveError(
      `${config.type} value must be a number. Received '${config.value}' for field '${config.field.name.value}'`,
    );
  }
};

const isNumericValidation = (type: ValidationType): boolean => {
  return (NUMERIC_VALIDATION_TYPES as readonly ValidationType[]).includes(type);
};

const isStringValidation = (type: ValidationType): boolean => {
  return (STRING_VALIDATION_TYPES as readonly ValidationType[]).includes(type);
};

const isLengthValidation = (type: ValidationType): boolean => {
  return ['minLength', 'maxLength'].includes(type);
};
