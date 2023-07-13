import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('is valid when @index directive is a scalar', () => {
    const schema = readSchema('valid-index-directive-schema.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });

  it('is invalid when @index directive is a non-scalar', () => {
    const schema = readSchema('invalid-index-directive-schema.graphql');
    const errorRegex = "@index directive on 'nonScalarIndex' cannot be a non-scalar";
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });
});
