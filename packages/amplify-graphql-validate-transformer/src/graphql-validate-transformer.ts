import { ValidateDirective } from '@aws-amplify/graphql-directives';
import { DirectiveWrapper, MappingTemplate, TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerPluginProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ValidateDirectiveArgs, ValidateDirectiveConfiguration, ValidationsByField, ValidationType } from './types';
import { validate } from './validators';
import { generateTypeValidationSnippet } from './vtl-generator';

export class ValidateTransformer extends TransformerPluginBase implements TransformerPluginProvider {
  private directiveMap = new Map<string, ValidateDirectiveConfiguration[]>();

  constructor() {
    super('amplify-graphql-validate-transformer', ValidateDirective.definition);
  }

  /**
   * Processes `@validate` directives and validates their usage and inputs.
   * @param parent - The parent object or interface type definition node containing the field
   * @param definition - The field definition node being processed
   * @param directive - The `@validate` directive node applied to the field
   * @param _ - The transformer schema visit step context provider (unused)
   */
  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    _: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const config = this.getValidateDirectiveConfiguration(directiveWrapped, parent as ObjectTypeDefinitionNode, definition);

    validate(parent as ObjectTypeDefinitionNode, definition, directive, config);

    const parentName = parent.name.value;
    if (!this.directiveMap.has(parentName)) {
      this.directiveMap.set(parentName, []);
    }
    this.directiveMap.get(parentName)!.push(config);
  };

  /**
   * Generates resolvers for validation directives.
   * @param ctx - The transformer context provider
   */
  generateResolvers = (ctx: TransformerContextProvider): void => {
    const mutationTypeName = ctx.output.getMutationTypeName();
    if (!mutationTypeName) {
      return;
    }

    // Generate a single validation snippet for each type
    for (const [typeName, configs] of this.directiveMap.entries()) {
      // Group validations by field
      const validationsByField: ValidationsByField = {};
      for (const config of configs) {
        const fieldName = config.fieldNode.name.value;
        if (!validationsByField[fieldName]) {
          validationsByField[fieldName] = [];
        }

        const defaultErrorMessage = constructDefaultErrorMessage(typeName, fieldName, config.validationType, config.validationValue);

        validationsByField[fieldName].push({
          validationType: config.validationType,
          validationValue: config.validationValue,
          errorMessage: config.errorMessage || defaultErrorMessage,
        });
      }

      // Generate a single combined VTL snippet for all validations in this type
      const combinedTypeSnippet = generateTypeValidationSnippet(typeName, validationsByField);

      // Add the combined validation to create mutation
      const createFieldName = `create${typeName}`;
      const createResolver = ctx.resolvers.getResolver(mutationTypeName, createFieldName);
      if (createResolver) {
        createResolver.addVtlFunctionToSlot(
          'validate',
          MappingTemplate.s3MappingTemplateFromString(
            combinedTypeSnippet,
            `${mutationTypeName}.${createFieldName}.{slotName}.{slotIndex}.req.vtl`,
          ),
        );
      }

      // Add the combined validation to update mutation
      const updateFieldName = `update${typeName}`;
      const updateResolver = ctx.resolvers.getResolver(mutationTypeName, updateFieldName);
      if (updateResolver) {
        updateResolver.addVtlFunctionToSlot(
          'validate',
          MappingTemplate.s3MappingTemplateFromString(
            combinedTypeSnippet,
            `${mutationTypeName}.${updateFieldName}.{slotName}.{slotIndex}.req.vtl`,
          ),
        );
      }
    }
  };

  /**
   * Extracts and formats the validation directive configuration from a `@validate` directive.
   * @param directive - The wrapped directive containing validation arguments
   * @param parentNode - The object type definition node that contains the field
   * @param fieldNode - The field definition node that the directive is applied to
   * @returns A configuration object containing the validation rules and metadata
   * @private
   */
  private getValidateDirectiveConfiguration(
    directive: DirectiveWrapper,
    parentNode: ObjectTypeDefinitionNode,
    fieldNode: FieldDefinitionNode,
  ): ValidateDirectiveConfiguration {
    const defaultArgs: ValidateDirectiveArgs = {
      type: '' as ValidationType,
      value: '',
      errorMessage: '',
    };
    const args = directive.getArguments<ValidateDirectiveArgs>(defaultArgs);

    return {
      parentNode,
      fieldNode,
      validationType: args.type,
      validationValue: args.value,
      errorMessage: args.errorMessage,
    };
  }
}

/**
 * Constructs a default error message based on the validation type and value.
 * @param typeName - The name of the type containing the field
 * @param fieldName - The name of the field being validated
 * @param validationType - The type of validation (e.g., gt, lt, minLength, etc.)
 * @param validationValue - The value used for validation
 * @returns A default error message string
 */
const constructDefaultErrorMessage = (
  typeName: string,
  fieldName: string,
  validationType: ValidationType,
  validationValue: string,
): string => {
  switch (validationType) {
    case 'gt':
      return `Field ${fieldName} of type ${typeName} must be greater than ${validationValue}`;
    case 'lt':
      return `Field ${fieldName} of type ${typeName} must be less than ${validationValue}`;
    case 'gte':
      return `Field ${fieldName} of type ${typeName} must be greater than or equal to ${validationValue}`;
    case 'lte':
      return `Field ${fieldName} of type ${typeName} must be less than or equal to ${validationValue}`;
    case 'minLength':
      return `Field ${fieldName} of type ${typeName} must have a minimum length of ${validationValue}`;
    case 'maxLength':
      return `Field ${fieldName} of type ${typeName} must have a maximum length of ${validationValue}`;
    case 'startsWith':
      return `Field ${fieldName} of type ${typeName} must start with ${validationValue}`;
    case 'endsWith':
      return `Field ${fieldName} of type ${typeName} must end with ${validationValue}`;
    case 'matches':
      return `Field ${fieldName} of type ${typeName} must match ${validationValue}`;
    default:
      throw new Error(`Unsupported validation type: ${validationType}`);
  }
};
