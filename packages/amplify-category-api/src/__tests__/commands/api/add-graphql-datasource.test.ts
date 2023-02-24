import * as path from 'path';
import { readSchema } from '../../../commands/api/add-graphql-datasource';

describe('read schema', () => {
  it('Valid schema present in folder', async () => {
    const graphqlSchemaPath = path.join(__dirname, 'mock-data', 'schema.graphql');
    expect(readSchema(graphqlSchemaPath)).toBeDefined();
  });

  it('Invalid schema present in folder', async () => {
    function invalidSchema() {
      const graphqlSchemaPath = path.join(__dirname, 'mock-data', 'invalid_schema.graphql');
      readSchema(graphqlSchemaPath);
    }
    expect(invalidSchema).toThrowErrorMatchingInlineSnapshot(`
      "Could not parse graphql scehma 
      typo Todo @model {
        id: ID!
        name: String!
        description: String
        createdAt: AWSDateTime!
        updatedAt: AWSDateTime!
      }
      "
    `);
  });

  it('Empty schema present in folder', async () => {
    const graphqlSchemaPath = path.join(__dirname, 'mock-data', 'empty_schema.graphql');
    expect(readSchema(graphqlSchemaPath)).toBeNull();
  });
});
