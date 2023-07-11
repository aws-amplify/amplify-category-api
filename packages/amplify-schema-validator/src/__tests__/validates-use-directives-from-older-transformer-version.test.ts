import { validateSchemaWithContext } from '..';
import { ValidateSchemaProps } from '../helpers/schema-validator-props';
import { readSchema } from './helpers/readSchema';

const schemaProps: ValidateSchemaProps = {
  graphqlTransformerVersion: 2,
  isDataStoreEnabled: true,
};

describe('Validate Schema', () => {
  it('fails validation when schema uses old directives in new transformer version', () => {
    const schema = readSchema('invalid-use-directives-from-older-transformer-version.graphql');
    const errorRegex =
      'InvalidDirectiveError - Your GraphQL Schema is using @key, @connection, @versioned directives from an older version of the GraphQL Transformer. Visit https://docs.amplify.aws/cli/migration/transformer-migration/ to learn how to migrate your GraphQL schema.';
    expect(() => validateSchemaWithContext(schema, schemaProps)).toThrow(errorRegex);
  });
});
