import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when hasOne and hasMany relation is used when datastore is enabled', () => {
    const schema = readSchema('invalid-use-belongsto-when-datastore-inuse.graphql');
    const errorRegex = 'InvalidDirectiveError - Post and Blog cannot refer to each other via @hasOne or @hasMany when DataStore is in use. Use @belongsTo instead. See https://docs.amplify.aws/cli/graphql/data-modeling/#belongs-to-relationship';
    expect(() => validateSchema(schema, undefined, true)).toThrow(errorRegex);
  });

  it('passes validation when hasOne and hasMany relation is used when datastore is disabled', () => {
    const schema = readSchema('invalid-use-belongsto-when-datastore-inuse.graphql');
    expect(() => validateSchema(schema, undefined, false)).not.toThrow();
  });
});
