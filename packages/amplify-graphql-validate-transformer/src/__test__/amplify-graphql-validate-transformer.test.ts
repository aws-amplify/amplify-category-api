import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ValidateTransformer } from '..';

test('amplify-graphql-validate-transformer', () => {
  const transformer = new ValidateTransformer();
  transformer.generateResolvers({} as TransformerContextProvider);
  expect(transformer).toBeDefined();
});
