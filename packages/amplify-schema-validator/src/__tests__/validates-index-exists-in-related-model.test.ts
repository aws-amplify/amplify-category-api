import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has an index with the same name more than once', () => {
    const schema = readSchema('invalid-index-exists-in-related-model.graphql');
    const errorRegex = 'Index byUser does not exist for model Test1';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has an index with same name defined once', () => {
    const schema = readSchema('valid-index-exists-in-related-model.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
