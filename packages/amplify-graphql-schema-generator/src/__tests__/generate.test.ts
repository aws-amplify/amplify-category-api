import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { graphqlSchemaFromSQLSchema } from '..';
import { schemas } from './__utils__/schemas';

describe('generate', () => {
  describe('graphqlSchemaFromSQLSchema', () => {
    const cases = Object.entries(schemas)
      .map(([engineType, schemasForEngine]) => Object.entries(schemasForEngine).map((schema) => [engineType, ...schema]))
      .reduce((accumulator, value) => accumulator.concat(value), []);
    test.each(cases)('creates graphql schema from %p %p schema', (engineType, _, schema) => {
      expect(graphqlSchemaFromSQLSchema(schema, engineType as ImportedRDSType)).toMatchSnapshot();
    });
  });
});
