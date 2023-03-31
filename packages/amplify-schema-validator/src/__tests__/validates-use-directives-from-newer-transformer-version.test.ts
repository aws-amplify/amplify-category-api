import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

const featureFlags = `{
  "features": {
    "graphqltransformer": {
      "transformerversion": 1
    }
  }
}`;

describe('Validate Schema', () => {
  it('fails validation when schema uses new directives in old transformer version', () => {
    const schema = readSchema('invalid-use-directives-from-newer-transformer-version.graphql');
    const errorRegex = 'InvalidDirectiveError - Your GraphQL Schema is using @primaryKey, @index, @hasOne, @hasMany directives from a newer version of the GraphQL Transformer. Visit https://docs.amplify.aws/cli/migration/transformer-migration/ to learn how to migrate your GraphQL schema.';
    expect(() => validateSchema(schema, featureFlags)).toThrow(errorRegex);
  });
});
