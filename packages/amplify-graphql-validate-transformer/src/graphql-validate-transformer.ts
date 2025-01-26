import { ValidateDirective } from '@aws-amplify/graphql-directives';
import { TransformerPluginBase, DirectiveWrapper } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerPluginProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ValidateArguments, ValidateDirectiveConfiguration } from './types';
import { validate } from './validators';

export class ValidateTransformer extends TransformerPluginBase implements TransformerPluginProvider {
  private directiveMap = new Map<string, ValidateDirectiveConfiguration[]>();

  constructor() {
    super('amplify-graphql-validate-transformer', ValidateDirective.definition);
  }

  /**
   * Processes `@validate` directives and validates their usage and inputs.
   *
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

  generateResolvers = (_: TransformerContextProvider): void => {
    // TODO:
    // 1. Generate validation checks in the resolver based on field type
    // 2. Return appropriate error messages for validation failures
  };

  /**
   * Extracts and formats the validation directive configuration from a `@validate` directive.
   *
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
    const defaultArgs: ValidateArguments = {
      type: '',
      value: '',
      errorMessage: '',
    };
    const args = directive.getArguments<ValidateArguments>(defaultArgs);

    return {
      parentNode,
      fieldNode,
      type: args.type,
      value: args.value,
      errorMessage: args.errorMessage,
    };
  }
}
