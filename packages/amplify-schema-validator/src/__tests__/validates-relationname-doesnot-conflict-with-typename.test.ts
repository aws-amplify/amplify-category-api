import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when relation name conflicts with type name', () => {
    const schema = readSchema('invalid-relationname-doesnot-conflict-with-typename.graphql');
    const errorRegex = '@manyToMany relation name FooBar (derived from foo   Bar) already exists as a type in the schema.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });
});
