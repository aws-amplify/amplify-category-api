import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has unmatched @belongsTo', () => {
    const schema = readSchema('invalid-belongs-to.graphql');
    const errorRegex =
      'Invalid @belongs directive in schema: @belongsTo directive requires that a @hasOne or @hasMany relationship already exists from parent to the related model.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has @belongsTo matched with @hasOne', () => {
    const schema = readSchema('valid-belongs-to-has-one.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });

  it('passes validation when schema has @belongsTo matched with @hasMany', () => {
    const schema = readSchema('valid-belongs-to-has-many.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
