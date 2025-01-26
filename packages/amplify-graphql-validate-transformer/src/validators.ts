import { ArgumentNode, DirectiveNode, FieldDefinitionNode, ObjectTypeDefinitionNode, StringValueNode } from 'graphql';
import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { getBaseType, isListType } from 'graphql-transformer-common';
import { NUMERIC_VALIDATION_TYPES, STRING_VALIDATION_TYPES, ValidateDirectiveConfiguration, ValidationType } from './types';

/**
 * Validates all aspects of the @validate directive configuration.
 */
export const validate = (
  definition: FieldDefinitionNode,
  parent: ObjectTypeDefinitionNode,
  directive: DirectiveNode,
  config: ValidateDirectiveConfiguration,
): void => {
  validateModelType(parent);
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
 * Validates that the field is inside a model type.
 */
const validateModelType = (parent: ObjectTypeDefinitionNode): void => {
  if (!parent.directives!.find((d) => d.name.value === 'model')) {
    throw new InvalidDirectiveError('@validate directive can only be used on fields within @model types.');
  }
};

/**
 * Validates that the field is not a list field.
 */
const validateNoListFieldValidation = (field: FieldDefinitionNode): void => {
  if (isListType(field.type)) {
    throw new InvalidDirectiveError(`@validate directive cannot be used on list field '${field.name.value}'`);
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
 * Validates that the field type is compatible with the validation type.
 */
const validateTypeCompatibility = (field: FieldDefinitionNode, validationType: ValidationType): void => {
  const baseType = getBaseType(field.type);

  if (isNumericValidation(validationType) && baseType !== 'Int' && baseType !== 'Float') {
    throw new InvalidDirectiveError(
      `Validation type '${validationType}' can only be used with numeric fields (Int, Float). Field '${field.name.value}' is of type '${baseType}'`,
    );
  }

  if (isStringValidation(validationType) && baseType !== 'String') {
    throw new InvalidDirectiveError(
      `Validation type '${validationType}' can only be used with String fields. Field '${field.name.value}' is of type '${baseType}'`,
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
