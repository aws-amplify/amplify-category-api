import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { AmplifyGraphqlDefinition, DEFAULT_MODEL_DATA_SOURCE_STRATEGY } from '../amplify-graphql-definition';
import { IAmplifyGraphqlDefinition } from '../types';
import { ModelDataSourceStrategy, SQLLambdaModelDataSourceStrategy } from '../model-datasource-strategy-types';

const TEST_SCHEMA = /* GraphQL */ `
  type Todo @model {
    id: ID!
    content: String!
  }
`;

const DEFAULT_TABLE_DS_DEFINITION: ModelDataSourceStrategy = {
  dbType: 'DYNAMODB',
  provisionStrategy: 'DEFAULT',
};

const AMPLIFY_TABLE_DS_DEFINITION: ModelDataSourceStrategy = {
  dbType: 'DYNAMODB',
  provisionStrategy: 'AMPLIFY_TABLE',
};

describe('AmplifyGraphqlDefinition', () => {
  describe('fromString', () => {
    it('returns the provided string and no functions and default dynamodb provision strategy', () => {
      const definition = AmplifyGraphqlDefinition.fromString(TEST_SCHEMA);
      expect(definition.schema).toEqual(TEST_SCHEMA);
      expect(definition.functionSlots.length).toEqual(0);
      expect(definition.dataSourceStrategies).toEqual({ Todo: DEFAULT_MODEL_DATA_SOURCE_STRATEGY });
    });

    it('returns amplify table strategy when explicitly defined', () => {
      const definition = AmplifyGraphqlDefinition.fromString(TEST_SCHEMA, AMPLIFY_TABLE_DS_DEFINITION);
      expect(definition.dataSourceStrategies).toEqual({ Todo: AMPLIFY_TABLE_DS_DEFINITION });
    });

    it('validates the SSM paths in SQL db connection config', () => {
      const strategy: SQLLambdaModelDataSourceStrategy = {
        name: 'MySqlLambda',
        dbType: 'MYSQL',
        dbConnectionConfig: {
          hostnameSsmPath: 'ssm/invalid/hostnameSsmPath',
          portSsmPath: 'ssm/invalid/portSsmPath',
          usernameSsmPath: 'ssm/invalid/usernameSsmPath',
          passwordSsmPath: '/ssm/valid/passwordSsmPath',
          databaseNameSsmPath: '/ssm/valid/databaseNameSsmPath',
        },
      };
      expect(() => AmplifyGraphqlDefinition.fromString(TEST_SCHEMA, strategy)).toThrowErrorMatchingInlineSnapshot(
        `"Invalid data source strategy \\"MySqlLambda\\". Following SSM paths must start with '/' in dbConnectionConfig: ssm/invalid/hostnameSsmPath, ssm/invalid/portSsmPath, ssm/invalid/usernameSsmPath."`,
      );
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
      expect(Object.keys(definition.referencedLambdaFunctions ?? {}).length).toEqual(0);
      expect(definition.dataSourceStrategies).toEqual({ Todo: DEFAULT_MODEL_DATA_SOURCE_STRATEGY });
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
      const rdsSchemaFilePath = path.join(tmpDir, 'schema.sql.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      fs.writeFileSync(rdsSchemaFilePath, rdsTestSchema);
      const definition = AmplifyGraphqlDefinition.fromFiles(schemaFilePath, rdsSchemaFilePath);
      expect(definition.schema).toEqual(`${TEST_SCHEMA}${os.EOL}${rdsTestSchema}`);
      expect(definition.functionSlots.length).toEqual(0);
      expect(Object.keys(definition.referencedLambdaFunctions ?? {}).length).toEqual(0);
    });

    it('binds to a DynamoDB data source', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromFiles(schemaFilePath);
      expect(definition.dataSourceStrategies).toEqual({
        Todo: DEFAULT_MODEL_DATA_SOURCE_STRATEGY,
      });
    });
  });

  describe('fromFilesAndStrategy', () => {
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
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath], DEFAULT_TABLE_DS_DEFINITION);
      expect(definition.schema).toEqual(TEST_SCHEMA);
      expect(definition.functionSlots.length).toEqual(0);
      expect(Object.keys(definition.referencedLambdaFunctions ?? {}).length).toEqual(0);
      expect(definition.dataSourceStrategies).toEqual({ Todo: DEFAULT_TABLE_DS_DEFINITION });
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
      const rdsSchemaFilePath = path.join(tmpDir, 'schema.sql.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      fs.writeFileSync(rdsSchemaFilePath, rdsTestSchema);
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath, rdsSchemaFilePath], DEFAULT_TABLE_DS_DEFINITION);
      expect(definition.schema).toEqual(`${TEST_SCHEMA}${os.EOL}${rdsTestSchema}`);
      expect(definition.functionSlots.length).toEqual(0);
      expect(Object.keys(definition.referencedLambdaFunctions ?? {}).length).toEqual(0);
    });

    it('binds to a dynamo data source', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath], DEFAULT_TABLE_DS_DEFINITION);
      expect(definition.dataSourceStrategies).toEqual({ Todo: DEFAULT_TABLE_DS_DEFINITION });
    });

    it('binds to a sql data source with a VPC configuration', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const strategy: SQLLambdaModelDataSourceStrategy = {
        name: 'MySqlLambda',
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
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath], strategy);
      expect(definition.dataSourceStrategies).toEqual({ Todo: strategy });
    });

    it('binds to a sql data source with no VPC configuration', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const strategy: SQLLambdaModelDataSourceStrategy = {
        name: 'MySqlLambda',
        dbType: 'MYSQL',
        dbConnectionConfig: {
          hostnameSsmPath: '/ssm/path/hostnameSsmPath',
          portSsmPath: '/ssm/path/portSsmPath',
          usernameSsmPath: '/ssm/path/usernameSsmPath',
          passwordSsmPath: '/ssm/path/passwordSsmPath',
          databaseNameSsmPath: '/ssm/path/databaseNameSsmPath',
        },
      };
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath], strategy);
      expect(definition.dataSourceStrategies).toEqual({ Todo: strategy });
    });

    it('validates the SSM paths in SQL db connection config', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const strategy: SQLLambdaModelDataSourceStrategy = {
        name: 'MySqlLambda',
        dbType: 'MYSQL',
        dbConnectionConfig: {
          hostnameSsmPath: 'ssm/invalid/hostnameSsmPath',
          portSsmPath: 'ssm/invalid/portSsmPath',
          usernameSsmPath: '/ssm/valid/usernameSsmPath',
          passwordSsmPath: '/ssm/valid/passwordSsmPath',
          databaseNameSsmPath: '/ssm/valid/databaseNameSsmPath',
        },
      };
      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      expect(() => AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath], strategy)).toThrowErrorMatchingInlineSnapshot(
        `"Invalid data source strategy \\"MySqlLambda\\". Following SSM paths must start with '/' in dbConnectionConfig: ssm/invalid/hostnameSsmPath, ssm/invalid/portSsmPath."`,
      );
    });
  });

  describe('combine', () => {
    it('returns the correct definition after the combination, preserving relationship and auth directives', () => {
      const amplifyTableSchema = /* GraphQL */ `
        type Blog @model @auth(rules: [{ allow: owner }]) {
          id: ID!
          posts: [Post] @hasMany
        }

        type Query {
          getOnlyOwner: [Int] @sql(statement: "SELECT 1") @auth(rules: [{ allow: owner }])
          getAllowPublic: [Int] @sql(statement: "SELECT 1") @auth(rules: [{ allow: public }])
        }

        type Mutation {
          updateOnlyOwner: [Int] @sql(statement: "UPDATE foo SET id = 1; SELECT 1") @auth(rules: [{ allow: owner }])
          updateAllowPublic: [Int] @sql(statement: "UPDATE foo SET id = 1; SELECT 1") @auth(rules: [{ allow: public }])
        }

        type Post @model @auth(rules: [{ allow: owner }, { allow: public, operations: [read] }]) {
          id: ID!
          blog: Blog @belongsTo
        }
      `;
      const definition1 = AmplifyGraphqlDefinition.fromString(TEST_SCHEMA);
      const definition2 = AmplifyGraphqlDefinition.fromString(amplifyTableSchema, AMPLIFY_TABLE_DS_DEFINITION);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toMatchSnapshot();
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(Object.keys(combinedDefinition.referencedLambdaFunctions ?? {}).length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Todo: DEFAULT_MODEL_DATA_SOURCE_STRATEGY,
        Blog: AMPLIFY_TABLE_DS_DEFINITION,
        Post: AMPLIFY_TABLE_DS_DEFINITION,
      });
    });

    it('merges referencedLambdaFunctions', () => {
      const func1 = { functionName: 'imfunc1' } as unknown as IFunction;
      const func2 = { functionName: 'imfunc2' } as unknown as IFunction;

      const definition1: IAmplifyGraphqlDefinition = {
        schema: TEST_SCHEMA,
        functionSlots: [],
        referencedLambdaFunctions: {
          definition1Func: func1,
        },
        dataSourceStrategies: {},
      };
      const definition2: IAmplifyGraphqlDefinition = {
        schema: /* GraphQL */ `
          type Blog @model {
            id: ID!
            posts: [Post] @hasMany
          }
        `,
        functionSlots: [],
        referencedLambdaFunctions: {
          definition2Func: func2,
        },
        dataSourceStrategies: {},
      };

      expect(AmplifyGraphqlDefinition.combine([definition1, definition2]).referencedLambdaFunctions).toEqual({
        definition1Func: func1,
        definition2Func: func2,
      });
    });
  });
});
