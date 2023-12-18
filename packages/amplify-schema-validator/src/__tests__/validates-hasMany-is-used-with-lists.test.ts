import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has a hasMany directive not used with lists', () => {
    const schema = readSchema('invalid-hasMany-must-be-used-with-lists.graphql');
    const errorRegex = 'bars field in Foo object has a @hasMany directive which must be used with a list. Use @hasOne for non-list types.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has a hasMany directive used with lists', () => {
    const schema = readSchema('valid-hasMany-must-be-used-with-lists.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
