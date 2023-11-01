import { graphqlSchemaFromRDSSchema } from '../';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { schemas } from './__utils__/schemas';

describe('generate', () => {
  describe('graphqlSchemaFromRDSSchema', () => {
    const cases = Object.entries(schemas)
      .map(([engineType, schemas]) => Object.entries(schemas).map((schema) => [engineType, ...schema]))
      .reduce((accumulator, value) => accumulator.concat(value), []);
    test.each(cases)('creates graphql schema from %p %p schema', (engineType, schemaName, schema) => {
      expect(graphqlSchemaFromRDSSchema(schema, engineType as ImportedRDSType, 2)).toMatchSnapshot();
    });
  });
});
