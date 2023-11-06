import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { graphqlSchemaFromRDSSchema } from '..';
import { schemas } from './__utils__/schemas';

describe('generate', () => {
  describe('graphqlSchemaFromRDSSchema', () => {
    const cases = Object.entries(schemas)
      .map(([engineType, schemasForEngine]) =>
        Object.entries(schemasForEngine).map(
          ([schemaName, schema]) =>
            [
              [engineType, schemaName, schema, undefined],
              [engineType, schemaName, schema, 1],
              [engineType, schemaName, schema, 2],
            ] as [string, string, string, number][],
        ),
      )
      .reduce((accumulator, value) => accumulator.concat(value), [])
      .reduce((accumulator, value) => accumulator.concat(value), []);
    test.each(cases)('creates graphql schema from %p %p schema', (engineType, _, schema, transformerVersion) => {
      expect(graphqlSchemaFromRDSSchema(schema, engineType as ImportedRDSType, transformerVersion)).toMatchSnapshot();
    });
  });
});
