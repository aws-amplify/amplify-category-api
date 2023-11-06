import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { graphqlSchemaFromRDSSchema } from '..';
import { schemas } from './__utils__/schemas';

describe('generate', () => {
  describe('graphqlSchemaFromRDSSchema', () => {
    const cases = Object.entries(schemas)
      .map(([engineType, schemasForEngine]) => Object.entries(schemasForEngine).map((schema) => [engineType, ...schema]))
      .reduce((accumulator, value) => accumulator.concat(value), []);
    test.each(cases)('creates graphql schema from %p %p schema', (engineType, _, schema) => {
      expect(graphqlSchemaFromRDSSchema(schema, engineType as ImportedRDSType)).toMatchSnapshot();
    });
  });
});
