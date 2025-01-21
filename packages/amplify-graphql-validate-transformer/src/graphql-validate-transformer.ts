import { ValidateDirective } from '@aws-amplify/graphql-directives';
import { TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';

export class ValidateTransformer extends TransformerPluginBase {
  constructor() {
    super('amplify-graphql-validate-transformer', ValidateDirective.definition);
  }

  generateResolvers = (ctx: TransformerContextProvider): void => {
    console.log('generateResolvers', ctx);
  };
}
