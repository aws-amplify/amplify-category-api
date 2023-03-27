import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has a field defined more than once', () => {
    const schema = readSchema('invalid-auth-must-be-annotated-with-model.graphql');
    const errorRegex = 'Types annotated with @auth must also be annotated with @model.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has a field defined once', () => {
    const schema = readSchema('valid-auth-must-be-annotated-with-model.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
