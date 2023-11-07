import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when field is not in the parent model', () => {
    const schema = readSchema('invalid-field-not-in-parent-model.graphql');
    const errorRegex = 'email is not a field in Test';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('fails validation when hasMany field is not in the parent model', () => {
    const schema = readSchema('invalid-field-not-in-parent-model-hasMany.graphql');
    const errorRegex = 'email is not a field in Test';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when field is in the parent model', () => {
    const schema = readSchema('valid-field-in-parent-model.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
