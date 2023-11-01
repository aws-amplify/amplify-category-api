import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { schemas } from './__utils__/schemas';
import { graphqlSchemaFromRDSSchema } from '..';

describe('generate', () => {
  describe('graphqlSchemaFromRDSSchema', () => {
    const cases = Object.entries(schemas)
      .map(([engineType, schemasForEngine]) => Object.entries(schemasForEngine).map((schema) => [engineType, ...schema]))
      .reduce((accumulator, value) => accumulator.concat(value), []);
    test.each(cases)('creates graphql schema from %p %p schema', (engineType, _, schema) => {
      expect(graphqlSchemaFromRDSSchema(schema, engineType as ImportedRDSType, 2)).toMatchSnapshot();
    });
  });
});
