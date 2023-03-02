import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when reserved words are used in model names', () => {
    const schema = readSchema('invalid-reserved-type-name.graphql');
    const errorRegex = 'Query is a reserved type name and currently in use within the default schema element.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });
});
