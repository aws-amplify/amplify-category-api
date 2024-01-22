import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when type annotated with @auth is not annotated with @model', () => {
    const schema = readSchema('invalid-auth-must-be-annotated-with-model.graphql');
    const errorRegex = 'Types annotated with @auth must also be annotated with @model.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when type annotated with @auth is annotated with @model', () => {
    const schema = readSchema('valid-auth-must-be-annotated-with-model.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
