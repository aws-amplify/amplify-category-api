import * as path from 'path';
import * as fs from 'fs-extra';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { SQLLambdaModelDataSourceStrategy } from '../../model-datasource-strategy';

const NO_MODEL_SCHEMA = /* GraphQL */ `
  type Todo {
    id: ID!
    content: String!
  }
  type Query {
    listTodos: [Todo] @sql(statement: "SELECT * FROM todos")
  }
`;

const MOCK_SQL_STRATEGY: SQLLambdaModelDataSourceStrategy = {
  dbType: 'MYSQL',
  name: 'mockSqlStrategy',
  dbConnectionConfig: {
    databaseNameSsmPath: '/dbname',
    hostnameSsmPath: '/hostname',
    passwordSsmPath: '/password',
    portSsmPath: '/port',
    usernameSsmPath: '/username',
  },
};

describe('SQLLambdaModelDataSourceStrategy', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync('fromFiles');
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true });
  });

  it('generates a definition for a schema that does not define a @model', () => {
    const definition = AmplifyGraphqlDefinition.fromString(NO_MODEL_SCHEMA, MOCK_SQL_STRATEGY);
    expect(definition.schema).toEqual(NO_MODEL_SCHEMA);
    expect(definition.functionSlots.length).toEqual(0);
    expect(definition.dataSourceStrategies).toMatchObject({});
  });

  it('provides the generated SQL Lambda function as an L1 construct for a schema that does not define a @model', () => {
    const stack = new cdk.Stack();
    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');
    const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
      definition: AmplifyGraphqlDefinition.fromString(NO_MODEL_SCHEMA, MOCK_SQL_STRATEGY),
      authorizationModes: {
        userPoolConfig: { userPool },
      },
    });

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).not.toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const lambdaDataSource = Object.values(cfnDataSources).find((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSource).toBeDefined();
    expect(lambdaDataSource?.lambdaConfig).toBeDefined();

    expect(functions).toBeDefined();
    const sqlLambda = functions['SQLLambdaFunction'];
    expect(sqlLambda).toBeDefined();
  });

  it('supports the statement attribute in fromFilesAndStrategy', () => {
    const stack = new cdk.Stack();
    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    const schemaPath = path.join(tmpDir, 'schema.graphql');
    fs.writeFileSync(schemaPath, NO_MODEL_SCHEMA);

    const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
      definition: AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaPath], MOCK_SQL_STRATEGY),
      authorizationModes: {
        userPoolConfig: { userPool },
      },
    });

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).not.toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const lambdaDataSource = Object.values(cfnDataSources).find((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSource).toBeDefined();
    expect(lambdaDataSource?.lambdaConfig).toBeDefined();

    expect(functions).toBeDefined();
    const sqlLambda = functions['SQLLambdaFunction'];
    expect(sqlLambda).toBeDefined();
  });

  it('supports the reference attribute in fromFilesAndStrategy', () => {
    const stack = new cdk.Stack();
    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    const schema = /* GraphQL */ `
      type Todo {
        id: ID!
        content: String!
      }
      type Query {
        listTodos: [Todo] @sql(reference: "custom-query")
      }
    `;
    const schemaPath = path.join(tmpDir, 'schema.graphql');
    fs.writeFileSync(schemaPath, schema);

    const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
      definition: AmplifyGraphqlDefinition.fromFilesAndStrategy([schemaPath], {
        ...MOCK_SQL_STRATEGY,
        customSqlStatements: {
          'custom-query': 'SELECT * FROM todos',
        },
      }),
      authorizationModes: {
        userPoolConfig: { userPool },
      },
    });

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).not.toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const lambdaDataSource = Object.values(cfnDataSources).find((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSource).toBeDefined();
    expect(lambdaDataSource?.lambdaConfig).toBeDefined();

    expect(functions).toBeDefined();
    const sqlLambda = functions['SQLLambdaFunction'];
    expect(sqlLambda).toBeDefined();
  });
});
