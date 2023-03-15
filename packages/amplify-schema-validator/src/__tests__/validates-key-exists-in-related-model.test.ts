import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has an index with the same name more than once', () => {
    const schema = readSchema('invalid-key-exists-in-related-model.graphql');
    const errorRegex = 'Key byBlog does not exist for model Post';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has an index with same name defined once', () => {
    const schema = readSchema('valid-key-exists-in-related-model.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
