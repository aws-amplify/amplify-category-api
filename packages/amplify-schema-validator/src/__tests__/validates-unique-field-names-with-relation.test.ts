import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation if relationship fields are not unique', () => {
    const schema = readSchema('invalid-unique-field-names-with-relation.graphql');
    const errorRegex = 'There are two or more relationship fields with the same name';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation if relationship names are unique', () => {
    const schema = readSchema('valid-unique-field-names-with-relation.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
