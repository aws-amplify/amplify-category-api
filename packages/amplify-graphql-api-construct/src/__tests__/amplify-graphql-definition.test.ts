import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AmplifyGraphqlDefinition } from '../amplify-graphql-definition';
import { ModelDataSourceBinding, SqlModelDataSourceBinding } from '../types';

const TEST_SCHEMA = /* GraphQL */ `
  type Todo @model {
    id: ID!
    content: String!
  }
`;

describe('AmplifyGraphqlDefinition', () => {
  describe('fromString', () => {
    it('returns the provided string and no functions', () => {
      const definition = AmplifyGraphqlDefinition.fromString(TEST_SCHEMA);
      expect(definition.schema).toEqual(TEST_SCHEMA);
      expect(definition.functionSlots.length).toEqual(0);
    });
  });

  describe('fromFiles', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync('fromFiles');
    });

    afterEach(() => {
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true });
    });

    it('extracts the definition from a single schema file', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromFiles(schemaFilePath);
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
      const definition = AmplifyGraphqlDefinition.fromFiles(schemaFilePath, rdsSchemaFilePath);
      expect(definition.schema).toEqual(`${TEST_SCHEMA}${os.EOL}${rdsTestSchema}`);
      expect(definition.functionSlots.length).toEqual(0);
    });

    it('binds to a DynamoDB data source', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromFiles(schemaFilePath);
      expect(definition.modelDataSourceBinding).toEqual({ bindingType: 'DynamoDB' });
    });
  });

  describe('fromFilesAndBinding', () => {
    let tmpDir: string;

    const defaultBinding: ModelDataSourceBinding = {
      bindingType: 'DynamoDB',
    };

    beforeEach(() => {
      tmpDir = fs.mkdtempSync('fromFiles');
    });

    afterEach(() => {
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true });
    });

    it('extracts the definition from a single schema file', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromBindingAndFiles(defaultBinding, schemaFilePath);
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
      const definition = AmplifyGraphqlDefinition.fromBindingAndFiles(defaultBinding, schemaFilePath, rdsSchemaFilePath);
      expect(definition.schema).toEqual(`${TEST_SCHEMA}${os.EOL}${rdsTestSchema}`);
      expect(definition.functionSlots.length).toEqual(0);
    });

    it('binds to a dynamo data source', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromBindingAndFiles(defaultBinding, schemaFilePath);
      expect(definition.modelDataSourceBinding).toEqual(defaultBinding);
    });

    it('binds to a sql data source', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const binding: SqlModelDataSourceBinding = {
        bindingType: 'MySQL',
        vpcConfiguration: {
          vpcId: 'vpc-1234abcd',
          securityGroupIds: ['sg-123'],
          subnetAvailabilityZones: [{ subnetId: 'subnet-123', availabilityZone: 'us-east-1a' }],
        },
        dbConnectionConfig: {
          hostnameSsmPath: '/ssm/path/hostnameSsmPath',
          portSsmPath: '/ssm/path/portSsmPath',
          usernameSsmPath: '/ssm/path/usernameSsmPath',
          passwordSsmPath: '/ssm/path/passwordSsmPath',
          databaseNameSsmPath: '/ssm/path/databaseNameSsmPath',
        },
      };
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromBindingAndFiles(binding, schemaFilePath);
      expect(definition.modelDataSourceBinding).toEqual(binding);
    });
  });
});
