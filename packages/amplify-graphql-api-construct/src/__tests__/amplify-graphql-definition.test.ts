import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AmplifyGraphqlDefinition, DEFAULT_MODEL_DATA_SOURCE_STRATEGY } from '../amplify-graphql-definition';
import { MOCK_SCHEMA, AMPLIFY_TABLE_DS_STRATEGY, DEFAULT_TABLE_DS_STRATEGY, makeSqlDataSourceStrategy } from './mock-definitions';

describe('AmplifyGraphqlDefinition', () => {
  describe('fromString', () => {
    it('returns the provided string and no functions and default dynamodb provision strategy', () => {
      const definition = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.todo.ddb);
      expect(definition.schema).toEqual(MOCK_SCHEMA.todo.ddb);
      expect(definition.functionSlots.length).toEqual(0);
      expect(definition.dataSourceStrategies).toEqual({ Todo: DEFAULT_MODEL_DATA_SOURCE_STRATEGY });
    });

    it('returns amplify table strategy when explicitly defined', () => {
      const definition = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.todo.ddb, AMPLIFY_TABLE_DS_STRATEGY);
      expect(definition.dataSourceStrategies).toEqual({ Todo: AMPLIFY_TABLE_DS_STRATEGY });
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
      fs.writeFileSync(schemaFilePath, MOCK_SCHEMA.todo.ddb);
      const definition = AmplifyGraphqlDefinition.fromFiles(schemaFilePath);
      expect(definition.schema).toEqual(MOCK_SCHEMA.todo.ddb);
      expect(definition.functionSlots.length).toEqual(0);
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
      const rdsSchemaFilePath = path.join(tmpDir, 'schema.rds.graphql');
      fs.writeFileSync(schemaFilePath, MOCK_SCHEMA.todo.ddb);
      fs.writeFileSync(rdsSchemaFilePath, rdsTestSchema);
      const definition = AmplifyGraphqlDefinition.fromFiles(schemaFilePath, rdsSchemaFilePath);
      expect(definition.schema).toEqual(`${MOCK_SCHEMA.todo.ddb}${os.EOL}${rdsTestSchema}`);
      expect(definition.functionSlots.length).toEqual(0);
    });

    it('binds to a DynamoDB data source', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      fs.writeFileSync(schemaFilePath, MOCK_SCHEMA.todo.ddb);
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
      fs.writeFileSync(schemaFilePath, MOCK_SCHEMA.todo.ddb);
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath], DEFAULT_TABLE_DS_STRATEGY);
      expect(definition.schema).toEqual(MOCK_SCHEMA.todo.ddb);
      expect(definition.functionSlots.length).toEqual(0);
      expect(definition.dataSourceStrategies).toEqual({ Todo: DEFAULT_TABLE_DS_STRATEGY });
    });

    it('extracts the definition from the schema files, appended in-order', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const rdsSchemaFilePath = path.join(tmpDir, 'schema.rds.graphql');
      fs.writeFileSync(schemaFilePath, MOCK_SCHEMA.todo.ddb);
      fs.writeFileSync(rdsSchemaFilePath, MOCK_SCHEMA.blog.sql);
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath, rdsSchemaFilePath], DEFAULT_TABLE_DS_STRATEGY);
      expect(definition.schema).toEqual(`${MOCK_SCHEMA.todo.ddb}${os.EOL}${MOCK_SCHEMA.blog.sql}`);
      expect(definition.functionSlots.length).toEqual(0);
    });

    it('creates a strategy with a dynamo data source', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      fs.writeFileSync(schemaFilePath, MOCK_SCHEMA.todo.ddb);
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath], DEFAULT_TABLE_DS_STRATEGY);
      expect(definition.dataSourceStrategies).toEqual({ Todo: DEFAULT_TABLE_DS_STRATEGY });
    });

    it('creates a strategy with a sql data source with a VPC configuration', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const strategy = makeSqlDataSourceStrategy('MySqlLambda');
      fs.writeFileSync(schemaFilePath, MOCK_SCHEMA.todo.sql);
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath], strategy);
      expect(definition.dataSourceStrategies).toEqual({ Todo: strategy });
    });

    it('creates a strategy with a sql data source with no VPC configuration', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const strategy = makeSqlDataSourceStrategy('MySqlLambda');
      delete (strategy as any).vpcConfiguration;
      fs.writeFileSync(schemaFilePath, MOCK_SCHEMA.todo.sql);
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath], strategy);
      expect(definition.dataSourceStrategies).toEqual({ Todo: strategy });
    });

    it('creates a definition with custom SQL statements', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.graphql');
      const customSqlSchemaFilePath = path.join(tmpDir, 'customsql-schema.graphql');
      const strategy = makeSqlDataSourceStrategy('MySqlLambda', {
        customSqlStatements: {
          myCustomQueryReference: MOCK_SCHEMA.customSql.statements.query,
          myCustomMutationReference: MOCK_SCHEMA.customSql.statements.mutation,
        },
      });
      fs.writeFileSync(schemaFilePath, MOCK_SCHEMA.todo.sql);
      fs.writeFileSync(customSqlSchemaFilePath, MOCK_SCHEMA.customSql.sql);
      const definition = AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaFilePath, customSqlSchemaFilePath], strategy);
      expect(definition.dataSourceStrategies).toEqual({
        Todo: strategy,
      });
    });
  });
});
