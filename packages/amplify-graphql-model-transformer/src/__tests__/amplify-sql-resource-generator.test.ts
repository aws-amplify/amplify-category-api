import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import {
  MYSQL_DB_TYPE,
  constructDataSourceStrategies,
  getResourceNamesForStrategy,
  validateModelSchema,
} from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { SQLLambdaModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '../graphql-model-transformer';

describe('ModelTransformer with SQL data sources:', () => {
  const mysqlStrategy: SQLLambdaModelDataSourceStrategy = {
    name: 'mysqlStrategy',
    dbType: MYSQL_DB_TYPE,
    dbConnectionConfig: {
      usernameSsmPath: '/test/username',
      passwordSsmPath: '/test/password',
      hostnameSsmPath: '/test/hostname',
      databaseNameSsmPath: '/test/databaseName',
      portSsmPath: '/test/port',
    },
  };

  it('should successfully transform simple valid schema', async () => {
    const validSchema = `
      type Post @model {
          id: ID! @primaryKey
          title: String!
      }
      type Comment @model {
        id: ID! @primaryKey
        content: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    const resourceNames = getResourceNamesForStrategy(mysqlStrategy);
    const sqlApiStack = out.stacks[resourceNames.sqlStack];
    expect(sqlApiStack).toBeDefined();
    expect(out.functions[`${resourceNames.sqlLambdaFunction}.zip`]).toBeDefined();
    expect(out.functions[`${resourceNames.sqlPatchingLambdaFunction}.zip`]).toBeDefined();
    validateModelSchema(parse(out.schema));
  });

  it('should assign SSM permissions', () => {
    const validSchema = `
      type Post @model {
          id: ID! @primaryKey
          title: String!
      }
      type Comment @model {
        id: ID! @primaryKey
        content: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    const resourceNames = getResourceNamesForStrategy(mysqlStrategy);
    const sqlApiStack = out.stacks[resourceNames.sqlStack];
    expect(sqlApiStack).toBeDefined();
    const [, policy] =
      Object.entries(sqlApiStack.Resources!).find(([resourceName]) => {
        return resourceName.startsWith(resourceNames.sqlLambdaExecutionRolePolicy);
      }) || [];
    expect(policy).toBeDefined();
    const {
      Properties: { PolicyDocument },
    } = policy;
    expect(PolicyDocument.Statement.length).toEqual(2);

    const ssmStatements = PolicyDocument.Statement.filter(
      (statement: any) => JSON.stringify(statement.Action) === JSON.stringify(['ssm:GetParameter', 'ssm:GetParameters']),
    );
    expect(ssmStatements.length).toEqual(1);
    expect(ssmStatements[0].Resource).toEqual(
      Object.values(mysqlStrategy.dbConnectionConfig).map((ssmPath) => `arn:aws:ssm:*:*:parameter${ssmPath}`),
    );

    const secretsManagerStatements = PolicyDocument.Statement.filter(
      (statement: any) => statement.Action === 'secretsmanager:GetSecretValue',
    );
    expect(secretsManagerStatements.length).toEqual(0);

    const kmsStatements = PolicyDocument.Statement.filter((statement: any) => statement.Action === 'kms:Decrypt');
    expect(kmsStatements.length).toEqual(0);

    const cloudWatchStatements = PolicyDocument.Statement.filter(
      (statement: any) =>
        JSON.stringify(statement.Action) === JSON.stringify(['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']),
    );
    expect(cloudWatchStatements.length).toEqual(1);
    expect(cloudWatchStatements[0].Resource).toEqual('arn:aws:logs:*:*:*');

    expect(PolicyDocument).toMatchSnapshot();
  });

  it('should assign secrets manager permissions', () => {
    const validSchema = `
      type Post @model {
          id: ID! @primaryKey
          title: String!
      }
      type Comment @model {
        id: ID! @primaryKey
        content: String
      }
    `;

    const secretArn = 'myfakesecretarn';
    const secretsManagerConfig = {
      ...mysqlStrategy,
      dbConnectionConfig: {
        databaseName: 'mydb',
        port: 3306,
        hostname: 'myfakehost',
        secretArn,
      },
    };
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, secretsManagerConfig),
    });
    expect(out).toBeDefined();
    const resourceNames = getResourceNamesForStrategy(secretsManagerConfig);
    const sqlApiStack = out.stacks[resourceNames.sqlStack];
    expect(sqlApiStack).toBeDefined();
    expect(sqlApiStack.Resources).toBeDefined();
    const [, policy] =
      Object.entries(sqlApiStack.Resources!).find(([resourceName]) => {
        return resourceName.startsWith(resourceNames.sqlLambdaExecutionRolePolicy);
      }) || [];
    expect(policy).toBeDefined();

    const {
      Properties: { PolicyDocument },
    } = policy;
    expect(PolicyDocument.Statement.length).toEqual(2);

    const ssmStatements = PolicyDocument.Statement.filter(
      (statement: any) => JSON.stringify(statement.Action) === JSON.stringify(['ssm:GetParameter', 'ssm:GetParameters']),
    );
    expect(ssmStatements.length).toEqual(0);

    const secretsManagerStatements = PolicyDocument.Statement.filter(
      (statement: any) => statement.Action === 'secretsmanager:GetSecretValue',
    );
    expect(secretsManagerStatements.length).toEqual(1);
    expect(secretsManagerStatements[0].Resource).toEqual(secretArn);

    const kmsStatements = PolicyDocument.Statement.filter((statement: any) => statement.Action === 'kms:Decrypt');
    expect(kmsStatements.length).toEqual(0);

    const cloudWatchStatements = PolicyDocument.Statement.filter(
      (statement: any) =>
        JSON.stringify(statement.Action) === JSON.stringify(['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']),
    );
    expect(cloudWatchStatements.length).toEqual(1);
    expect(cloudWatchStatements[0].Resource).toEqual('arn:aws:logs:*:*:*');

    expect(PolicyDocument).toMatchSnapshot();
  });

  it('should assign secrets manager permissions with custom encryption key', () => {
    const validSchema = `
      type Post @model {
          id: ID! @primaryKey
          title: String!
      }
      type Comment @model {
        id: ID! @primaryKey
        content: String
      }
    `;

    const secretArn = 'myfakesecretarn';
    const keyArn = 'myfakekeyarn';
    const secretsManagerConfig = {
      ...mysqlStrategy,
      dbConnectionConfig: {
        databaseName: 'mydb',
        port: 3306,
        hostname: 'myfakehost',
        secretArn,
        keyArn,
      },
    };
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, secretsManagerConfig),
    });
    expect(out).toBeDefined();
    const resourceNames = getResourceNamesForStrategy(secretsManagerConfig);
    const sqlApiStack = out.stacks[resourceNames.sqlStack];
    expect(sqlApiStack).toBeDefined();
    expect(sqlApiStack.Resources).toBeDefined();
    const [, policy] =
      Object.entries(sqlApiStack.Resources!).find(([resourceName]) => {
        return resourceName.startsWith(resourceNames.sqlLambdaExecutionRolePolicy);
      }) || [];
    expect(policy).toBeDefined();
    const {
      Properties: { PolicyDocument },
    } = policy;
    expect(PolicyDocument.Statement.length).toEqual(3);

    const ssmStatements = PolicyDocument.Statement.filter(
      (statement: any) => JSON.stringify(statement.Action) === JSON.stringify(['ssm:GetParameter', 'ssm:GetParameters']),
    );
    expect(ssmStatements.length).toEqual(0);

    const secretsManagerStatements = PolicyDocument.Statement.filter(
      (statement: any) => statement.Action === 'secretsmanager:GetSecretValue',
    );
    expect(secretsManagerStatements.length).toEqual(1);
    expect(secretsManagerStatements[0].Resource).toEqual(secretArn);

    const kmsStatements = PolicyDocument.Statement.filter((statement: any) => statement.Action === 'kms:Decrypt');
    expect(kmsStatements.length).toEqual(1);
    expect(kmsStatements[0].Resource).toEqual(keyArn);

    const cloudWatchStatements = PolicyDocument.Statement.filter(
      (statement: any) =>
        JSON.stringify(statement.Action) === JSON.stringify(['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']),
    );
    expect(cloudWatchStatements.length).toEqual(1);
    expect(cloudWatchStatements[0].Resource).toEqual('arn:aws:logs:*:*:*');

    expect(PolicyDocument).toMatchSnapshot();
  });
});
