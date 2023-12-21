import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when @belongsTo/@hasOne/@hasMany/@connection was used with a related type that is not a model', () => {
    const schema = readSchema('invalid-object-must-be-annotated-with-model.graphql');
    const errorRegex = 'Object type Bar must be annotated with @model';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when @belongsTo/@hasOne/@hasMany/@connection was used with a related type that is a model', () => {
    const schema = readSchema('valid-object-must-be-annotated-with-model.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
