import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('is valid when schema includes nonnulltype', () => {
    const schema = readSchema('schema-with-nonnulltype.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
