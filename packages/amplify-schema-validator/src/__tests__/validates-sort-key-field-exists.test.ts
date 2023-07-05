import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when sort key field does not exist in model', () => {
    const schema = readSchema('invalid-sort-key-field-exists.graphql');
    const errorRegex = "Can't find field 'createdAt' in Test, but it was specified in index 'byName'";
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when sort key field exists in model', () => {
    const schema = readSchema('valid-sort-key-field-exists.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
