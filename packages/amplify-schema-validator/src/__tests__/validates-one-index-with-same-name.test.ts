import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has an index with the same name more than once', () => {
    const schema = readSchema('invalid-one-index-with-same-name.graphql');
    const errorRegex = 'You may only supply one @index with the name byTeam on type Project';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has an index with same name defined once', () => {
    const schema = readSchema('valid-one-index-with-same-name.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
