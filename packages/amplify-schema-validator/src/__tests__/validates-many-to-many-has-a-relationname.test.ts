import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has a manyToMany directive without a relationName', () => {
    const schema = readSchema('invalid-many-to-many-has-a-relationname-test1.graphql');
    const errorRegex = '@manyToMany relation does not have a relationName';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('fails validation when schema has a manyToMany directive without a relationName', () => {
    const schema = readSchema('invalid-many-to-many-has-a-relationname-test2.graphql');
    const errorRegex = '@manyToMany relation does not have a relationName';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has a manyToMany directive with a relationName', () => {
    const schema = readSchema('valid-many-to-many-has-a-relationname.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
