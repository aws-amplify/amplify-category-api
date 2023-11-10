import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AmplifyGraphqlDefinition, DEFAULT_MODEL_DATA_SOURCE_DEFINITION } from '../amplify-graphql-definition';
import { ModelDataSourceDefinition, SQLLambdaModelDataSourceDefinitionStrategy } from '../types';

const TEST_SCHEMA = /* GraphQL */ `
  type Todo @model {
    id: ID!
    content: String!
  }
`;

const DEFAULT_TABLE_DS_DEFINITION: ModelDataSourceDefinition = {
  name: 'DefaultDynamoDB',
  strategy: {
    dbType: 'DYNAMODB',
    provisionStrategy: 'DEFAULT',
  },
};

const AMPLIFY_TABLE_DS_DEFINITION: ModelDataSourceDefinition = {
  name: 'customDDB',
  strategy: {
    dbType: 'DYNAMODB',
    provisionStrategy: 'AMPLIFY_TABLE',
  },
};

describe('AmplifyGraphqlDefinition', () => {
  describe('fromString', () => {
    it('returns the provided string and no functions and default dynamodb provision strategy', () => {
      const definition = AmplifyGraphqlDefinition.fromString(TEST_SCHEMA);
      expect(definition.schema).toEqual(TEST_SCHEMA);
      expect(definition.functionSlots.length).toEqual(0);
      expect(definition.dataSourceDefinition).toEqual({ Todo: DEFAULT_MODEL_DATA_SOURCE_DEFINITION });
    });

    it('returns amplify table strategy when explicitly defined', () => {
      const definition = AmplifyGraphqlDefinition.fromString(TEST_SCHEMA, AMPLIFY_TABLE_DS_DEFINITION);
      expect(definition.dataSourceDefinition).toEqual({ Todo: AMPLIFY_TABLE_DS_DEFINITION });
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
      expect(definition.dataSourceDefinition).toEqual({ Todo: DEFAULT_MODEL_DATA_SOURCE_DEFINITION });
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
      expect(definition.dataSourceDefinition).toEqual({
        Todo: DEFAULT_MODEL_DATA_SOURCE_DEFINITION,
      });
    });
  });

  describe('fromFilesAndDefinition', () => {
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
      const definition = AmplifyGraphqlDefinition.fromFilesAndDefinition([schemaFilePath], DEFAULT_TABLE_DS_DEFINITION);
      expect(definition.schema).toEqual(TEST_SCHEMA);
      expect(definition.functionSlots.length).toEqual(0);
      expect(definition.dataSourceDefinition).toEqual({ Todo: DEFAULT_TABLE_DS_DEFINITION });
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
      const definition = AmplifyGraphqlDefinition.fromFilesAndDefinition([schemaFilePath, rdsSchemaFilePath], DEFAULT_TABLE_DS_DEFINITION);
      expect(definition.schema).toEqual(`${TEST_SCHEMA}${os.EOL}${rdsTestSchema}`);
      expect(definition.functionSlots.length).toEqual(0);
    });

    it('binds to a dynamo data source', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromFilesAndDefinition([schemaFilePath], DEFAULT_TABLE_DS_DEFINITION);
      expect(definition.dataSourceDefinition).toEqual({ Todo: DEFAULT_TABLE_DS_DEFINITION });
    });

    it('binds to a sql data source with a VPC configuration', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const strategy: SQLLambdaModelDataSourceDefinitionStrategy = {
        dbType: 'MYSQL',
        vpcConfiguration: {
          vpcId: 'vpc-1234abcd',
          securityGroupIds: ['sg-123'],
          subnetAvailabilityZoneConfig: [{ subnetId: 'subnet-123', availabilityZone: 'us-east-1a' }],
        },
        dbConnectionConfig: {
          hostnameSsmPath: '/ssm/path/hostnameSsmPath',
          portSsmPath: '/ssm/path/portSsmPath',
          usernameSsmPath: '/ssm/path/usernameSsmPath',
          passwordSsmPath: '/ssm/path/passwordSsmPath',
          databaseNameSsmPath: '/ssm/path/databaseNameSsmPath',
        },
      };
      const modelDefinition: ModelDataSourceDefinition = {
        name: 'MySqlLambda',
        strategy,
      };
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromFilesAndDefinition([schemaFilePath], modelDefinition);
      expect(definition.dataSourceDefinition).toEqual({ Todo: modelDefinition });
    });

    it('binds to a sql data source with no VPC configuration', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const strategy: SQLLambdaModelDataSourceDefinitionStrategy = {
        dbType: 'MYSQL',
        dbConnectionConfig: {
          hostnameSsmPath: '/ssm/path/hostnameSsmPath',
          portSsmPath: '/ssm/path/portSsmPath',
          usernameSsmPath: '/ssm/path/usernameSsmPath',
          passwordSsmPath: '/ssm/path/passwordSsmPath',
          databaseNameSsmPath: '/ssm/path/databaseNameSsmPath',
        },
      };
      const modelDefinition: ModelDataSourceDefinition = {
        name: 'MySqlLambda',
        strategy,
      };
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromFilesAndDefinition([schemaFilePath], modelDefinition);
      expect(definition.dataSourceDefinition).toEqual({ Todo: modelDefinition });
    });
  });

  describe('combine', () => {
    it('returns the correct definition after the combination', () => {
      const amplifyTableSchema = /* GraphQL */ `
        type Blog @model {
          id: ID!
          posts: [Post] @hasMany
        }

        type Post @model {
          id: ID!
          blog: Blog @belongsTo
        }
      `;
      const definition1 = AmplifyGraphqlDefinition.fromString(TEST_SCHEMA);
      const definition2 = AmplifyGraphqlDefinition.fromString(amplifyTableSchema, AMPLIFY_TABLE_DS_DEFINITION);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toEqual(`${TEST_SCHEMA}${os.EOL}${amplifyTableSchema}`);
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceDefinition).toEqual({
        Todo: DEFAULT_MODEL_DATA_SOURCE_DEFINITION,
        Blog: AMPLIFY_TABLE_DS_DEFINITION,
        Post: AMPLIFY_TABLE_DS_DEFINITION,
      });
    });
  });
});
