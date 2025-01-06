import { ValidateTransformer } from '..';

test('amplify-graphql-validate-transformer', () => {
  const transformer = new ValidateTransformer();
  expect(transformer).toBeDefined();
});
