import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has a hasOne directive used with lists', () => {
    const schema = readSchema('invalid-hasOne-cannot-be-used-with-lists.graphql');
    const errorRegex = '@hasOne cannot be used with lists in bars field in Foo object. Use @hasMany instead';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has a hasOne directive not used with lists', () => {
    const schema = readSchema('valid-hasOne-cannot-be-used-with-lists.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
