import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has only one @manyToMany directive', () => {
    const schema = readSchema('invalid-many-to-many-count.graphql');
    const errorRegex = "Invalid @manyToMany directive in schema: relation names 'PostTags' must be used in exactly two locations.";
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });
});
