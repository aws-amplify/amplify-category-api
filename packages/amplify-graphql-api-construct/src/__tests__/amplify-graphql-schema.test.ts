import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { AmplifyGraphqlSchema } from '../amplify-graphql-schema';

const TEST_SCHEMA = /* GraphQL */ `
  type Todo @model {
    id: ID!
    content: String!
  }
`;

describe('AmplifyGraphqlSchema', () => {
  describe('fromString', () => {
    it('returns the provided string and no functions', () => {
      const schema = AmplifyGraphqlSchema.fromString(TEST_SCHEMA);
      expect(schema.definition).toEqual(TEST_SCHEMA);
      expect(schema.functionSlots.length).toEqual(0);
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
      const schemaFile = SchemaFile.fromAsset(schemaFilePath);
      const schema = AmplifyGraphqlSchema.fromSchemaFiles(schemaFile);
      expect(schema.definition).toEqual(TEST_SCHEMA);
      expect(schema.functionSlots.length).toEqual(0);
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
      const schemaFile = SchemaFile.fromAsset(schemaFilePath);
      const rdsSchemaFile = SchemaFile.fromAsset(rdsSchemaFilePath);
      const schema = AmplifyGraphqlSchema.fromSchemaFiles(schemaFile, rdsSchemaFile);
      expect(schema.definition).toEqual(`${TEST_SCHEMA}${os.EOL}${rdsTestSchema}`);
      expect(schema.functionSlots.length).toEqual(0);
    });
  });
});
