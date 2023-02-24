import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has a field defined more than once', () => {
    const schema = readSchema('invalid-field-is-not-defined-once.graphql');
    const errorRegex = 'Schema validation failed. Field Test.email can only be defined once.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has a field defined once', () => {
    const schema = readSchema('valid-field-is-defined-once.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
