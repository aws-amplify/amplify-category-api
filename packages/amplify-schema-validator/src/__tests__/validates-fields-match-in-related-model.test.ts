import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when field is not in the parent model', () => {
    const schema = readSchema('invalid-field-not-in-related-model.graphql');
    const errorRegex = 'email is not a field in Test1';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when field is in the parent model', () => {
    const schema = readSchema('valid-field-in-related-model.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
