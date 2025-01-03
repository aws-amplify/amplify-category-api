import { ValidateDirective } from '@aws-amplify/graphql-directives';
import { TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';

export class ValidateTransformer extends TransformerPluginBase {
  constructor() {
    super('amplify-graphql-validate-transformer', ValidateDirective.definition);
  }
}
