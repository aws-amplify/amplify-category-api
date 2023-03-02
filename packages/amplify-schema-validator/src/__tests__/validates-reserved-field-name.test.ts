import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when reserved words are used in model names', () => {
    const schema = readSchema('invalid-reserved-field-name.graphql');
    const errorRegex = '_version is a reserved word and cannnot be used as a field name.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });
});
