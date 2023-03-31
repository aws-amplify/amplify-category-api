import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

const featureFlags = `{
  "features": {
    "graphqltransformer": {
      "transformerversion": 2
    }
  }
}`;

describe('Validate Schema', () => {
  it('fails validation when schema uses old directives in new transformer version', () => {
    const schema = readSchema('invalid-use-directives-from-older-transformer-version.graphql');
    const errorRegex = 'InvalidDirectiveError - Your GraphQL Schema is using @key, @connection, @versioned directives from an older version of the GraphQL Transformer. Visit https://docs.amplify.aws/cli/migration/transformer-migration/ to learn how to migrate your GraphQL schema.';
    expect(() => validateSchema(schema, featureFlags)).toThrow(errorRegex);
  });
});
