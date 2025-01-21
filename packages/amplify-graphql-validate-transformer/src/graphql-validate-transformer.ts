import { ValidateDirective } from '@aws-amplify/graphql-directives';
import { TransformerPluginBase, DirectiveWrapper, InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerPluginProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  ArgumentNode,
  DirectiveNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  StringValueNode,
} from 'graphql';
import { getBaseType } from 'graphql-transformer-common';
import { NUMERIC_VALIDATION_TYPES, STRING_VALIDATION_TYPES, ValidateArguments, ValidateDirectiveConfiguration } from './types';

/**
 * Validates that length validation values (minLength, maxLength) are valid positive integers.
 */
const validateLengthValue = (config: ValidateDirectiveConfiguration): void => {
  if (config.type !== 'minLength' && config.type !== 'maxLength') {
    return;
  }

  const value = parseFloat(config.value);
  if (isNaN(value) || !Number.isInteger(value) || value <= 0) {
    // TODO: decide if we want to allow 0
    throw new InvalidDirectiveError(
      `${config.type} value must be a positive integer. Received '${config.value}' for field '${config.field.name.value}'`,
    );
  }
};

/**
 * Validates that the validation type is compatible with the field type.
 */
const validateTypeCompatibility = (field: FieldDefinitionNode, validationType: string): void => {
  const baseTypeName = getBaseType(field.type);
  const isNumericValidation = NUMERIC_VALIDATION_TYPES.includes(validationType as any);
  const isStringValidation = STRING_VALIDATION_TYPES.includes(validationType as any);

  if (isNumericValidation && baseTypeName !== 'Int' && baseTypeName !== 'Float') {
    throw new InvalidDirectiveError(
      `Validation type '${validationType}' can only be used with numeric fields (Int, Float). Field '${field.name.value}' is of type '${baseTypeName}'`,
    );
  }

  if (isStringValidation && baseTypeName !== 'String') {
    throw new InvalidDirectiveError(
      `Validation type '${validationType}' can only be used with String fields. Field '${field.name.value}' is of type '${baseTypeName}'`,
    );
  }
};

/**
 * Validates that there are no duplicate validation types on the same field.
 */
const validateNoDuplicateTypes = (field: FieldDefinitionNode, currentDirective: DirectiveNode, currentType: string): void => {
  for (const peerDirective of field.directives!) {
    if (peerDirective === currentDirective) {
      continue;
    }

    if (peerDirective.name.value === 'validate') {
      const peerType = peerDirective.arguments?.find((arg: ArgumentNode) => arg.name.value === 'type')?.value as StringValueNode;
      if (peerType?.value === currentType) {
        throw new InvalidDirectiveError(
          `Duplicate @validate directive with type '${currentType}' on field '${field.name.value}'. Each validation type can only be used once per field.`,
        );
      }
    }
  }
};

export class ValidateTransformer extends TransformerPluginBase implements TransformerPluginProvider {
  private directiveMap = new Map<string, ValidateDirectiveConfiguration[]>();

  constructor() {
    super('amplify-graphql-validate-transformer', ValidateDirective.definition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    _: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const config = this.getValidateDirectiveConfiguration(directiveWrapped, parent as ObjectTypeDefinitionNode, definition);

    validateTypeCompatibility(definition, config.type);
    validateNoDuplicateTypes(definition, directive, config.type);
    validateLengthValue(config);

    if (!this.directiveMap.has(parent.name.value)) {
      this.directiveMap.set(parent.name.value, []);
    }
    this.directiveMap.get(parent.name.value)!.push(config);
  };

  generateResolvers = (_: TransformerContextProvider): void => {
    // TODO:
    // 1. Generate validation checks in the resolver based on field type
    // 2. Return appropriate error messages for validation failures
  };

  private getValidateDirectiveConfiguration(
    directive: DirectiveWrapper,
    object: ObjectTypeDefinitionNode,
    field: FieldDefinitionNode,
  ): ValidateDirectiveConfiguration {
    const defaultArgs: ValidateArguments = {
      type: '',
      value: '',
      errorMessage: '',
    };
    const args = directive.getArguments<ValidateArguments>(defaultArgs);

    return {
      object,
      field,
      type: args.type,
      value: args.value,
      errorMessage: args.errorMessage,
    };
  }
}
