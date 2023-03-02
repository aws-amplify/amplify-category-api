import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has a field defined more than once', () => {
    const schema = readSchema('invalid-correct-type-in-many-to-many-relation.graphql');
    const errorRegex = 'Schema validation failed. Field Test.email can only be defined once.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has a field defined once', () => {
    const schema = readSchema('valid-correct-type-in-many-to-many-relation.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
