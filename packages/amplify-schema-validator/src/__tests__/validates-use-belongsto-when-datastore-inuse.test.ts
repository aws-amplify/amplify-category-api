import { validateSchemaWithContext } from '..';
import { ValidateSchemaProps } from '../helpers/schema-validator-props';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when hasOne and hasMany relation is used when datastore is enabled', () => {
    const schemaProps: ValidateSchemaProps = {
      graphqlTransformerVersion: 2,
      isDataStoreEnabled: true,
    };
    const schema = readSchema('invalid-use-belongsto-when-datastore-inuse.graphql');
    const errorRegex =
      'InvalidDirectiveError - Post and Blog cannot refer to each other via @hasOne or @hasMany when DataStore is in use. Use @belongsTo instead. See https://docs.amplify.aws/cli/graphql/data-modeling/#belongs-to-relationship';
    expect(() => validateSchemaWithContext(schema, schemaProps)).toThrow(errorRegex);
  });

  it('passes validation when hasOne and hasMany relation is used when datastore is disabled', () => {
    const schemaProps: ValidateSchemaProps = {
      graphqlTransformerVersion: 2,
      isDataStoreEnabled: false,
    };
    const schema = readSchema('invalid-use-belongsto-when-datastore-inuse.graphql');
    expect(() => validateSchemaWithContext(schema, schemaProps)).not.toThrow();
  });
});
