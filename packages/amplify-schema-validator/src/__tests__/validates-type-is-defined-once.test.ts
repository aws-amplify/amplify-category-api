import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has a type defined more than once', () => {
    const schema = readSchema('invalid-type-is-not-defined-once.graphql');
    const errorRegex = 'Schema validation failed. There can be only one type named Test.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has a type defined once', () => {
    const schema = readSchema('valid-type-is-defined-once.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
