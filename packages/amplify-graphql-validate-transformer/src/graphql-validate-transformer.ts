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

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    _: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const config = this.getValidateDirectiveConfiguration(directiveWrapped, parent as ObjectTypeDefinitionNode, definition);

    validate(definition, directive, config);

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
