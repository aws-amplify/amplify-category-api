import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has belongs to fields which does not match related type primary key1', () => {
    const schema = readSchema('invalid-belongs-to-fields-match-related-type-primary-key1.graphql');
    const errorRegex = 'email field is not of type ID';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('fails validation when schema has belongs to fields which does not match related type primary key2', () => {
    const schema = readSchema('invalid-belongs-to-fields-match-related-type-primary-key2.graphql');
    const errorRegex = 'email field is not of type ID';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('fails validation when schema has belongs to fields which does not match related type primary key3', () => {
    const schema = readSchema('invalid-belongs-to-fields-match-related-type-primary-key3.graphql');
    const errorRegex = 'email field is not of type ID';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('fails validation when schema has belongs to fields which does not match related type primary key4', () => {
    const schema = readSchema('invalid-belongs-to-fields-match-related-type-primary-key4.graphql');
    const errorRegex = 'name field is not of type ID';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has belongs to fields which match related type primary key', () => {
    const schema = readSchema('valid-belongs-to-fields-match-related-type-primary-key.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
