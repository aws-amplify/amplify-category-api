import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AmplifyDataDefinition } from '../amplify-data-definition';

const TEST_SCHEMA = /* GraphQL */ `
  type Todo @model {
    id: ID!
    content: String!
  }
`;

describe('AmplifyDataDefinition', () => {
  describe('fromString', () => {
    it('returns the provided string and no functions', () => {
      const definition = AmplifyDataDefinition.fromString(TEST_SCHEMA);
      expect(definition.schema).toEqual(TEST_SCHEMA);
      expect(definition.functionSlots.length).toEqual(0);
    });
  });

  describe('fromSchemaFiles', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync('fromSchemaFile');
    });

    afterEach(() => {
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true });
    });

    it('extracts the definition from a single schema file', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyDataDefinition.fromFiles(schemaFilePath);
      expect(definition.schema).toEqual(TEST_SCHEMA);
      expect(definition.functionSlots.length).toEqual(0);
    });

    it('extracts the definition from the schema files, appended in-order', () => {
      const rdsTestSchema = /* GraphQL */ `
        type Blog @model {
          id: ID!
          posts: [Post] @hasMany
        }

        type Post @model {
          id: ID!
          blog: Blog @belongsTo
        }
      `;
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const rdsSchemaFilePath = path.join(tmpDir, 'schema.rds.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      fs.writeFileSync(rdsSchemaFilePath, rdsTestSchema);
      const definition = AmplifyDataDefinition.fromFiles(schemaFilePath, rdsSchemaFilePath);
      expect(definition.schema).toEqual(`${TEST_SCHEMA}${os.EOL}${rdsTestSchema}`);
      expect(definition.functionSlots.length).toEqual(0);
    });
  });
});
