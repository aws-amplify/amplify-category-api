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

  it('should successfully transform simple valid schema', async () => {
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

  it('should process connection uri as input', () => {
    const connectionStringMySql = {
      ...mysqlStrategy,
      dbConnectionConfig: {
        connectionUriSsmPath: '/test/connectionUri',
      },
    };
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, connectionStringMySql),
    });
    expect(out).toBeDefined();
    const resourceNames = getResourceNamesForStrategy(connectionStringMySql);
    const sqlApiStack = out.stacks[resourceNames.sqlStack];
    expect(sqlApiStack).toBeDefined();

    // Check that SSM permissions are assigned
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
    expect(ssmStatements[0].Resource).toEqual(`arn:aws:ssm:*:*:parameter${connectionStringMySql.dbConnectionConfig.connectionUriSsmPath}`);

    // Check that secrets manager permissions are not assigned
    const secretsManagerStatements = PolicyDocument.Statement.filter(
      (statement: any) => statement.Action === 'secretsmanager:GetSecretValue',
    );
    expect(secretsManagerStatements.length).toEqual(0);

    const kmsStatements = PolicyDocument.Statement.filter((statement: any) => statement.Action === 'kms:Decrypt');
    expect(kmsStatements.length).toEqual(0);

    // Check that cloudwatch permissions are assigned
    const cloudWatchStatements = PolicyDocument.Statement.filter(
      (statement: any) =>
        JSON.stringify(statement.Action) === JSON.stringify(['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']),
    );
    expect(cloudWatchStatements.length).toEqual(1);
    expect(cloudWatchStatements[0].Resource).toEqual('arn:aws:logs:*:*:*');

    expect(PolicyDocument).toMatchSnapshot();

    // Check that the connection uri is passed to the lambda as an environment variable
    const [, sqlLambda] =
      Object.entries(sqlApiStack.Resources!).find(([resourceName]) => {
        return resourceName.startsWith(resourceNames.sqlLambdaFunction);
      }) || [];
    expect(sqlLambda).toBeDefined();
    const envVars = sqlLambda.Properties.Environment.Variables;
    expect(envVars).toBeDefined();
    expect(envVars.connectionString).toBeDefined();
    expect(envVars.CREDENTIAL_STORAGE_METHOD).toEqual('SSM');
    expect(envVars.SSM_ENDPOINT).toBeDefined();
  });

  it('should accept multiple connection uris as input', () => {
    const connectionStringMySql = {
      ...mysqlStrategy,
      dbConnectionConfig: {
        connectionUriSsmPath: ['/test/connectionUri/1', '/test/connectionUri/2'],
      },
    };
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, connectionStringMySql),
    });
    expect(out).toBeDefined();
    const resourceNames = getResourceNamesForStrategy(connectionStringMySql);
    const sqlApiStack = out.stacks[resourceNames.sqlStack];
    expect(sqlApiStack).toBeDefined();

    // Check that SSM permissions are assigned
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
    const ssmPaths = connectionStringMySql.dbConnectionConfig.connectionUriSsmPath;
    expect(ssmStatements.length).toEqual(1);
    expect(ssmStatements[0].Resource).toEqual(ssmPaths.map((ssmPath) => `arn:aws:ssm:*:*:parameter${ssmPath}`));

    // Check that secrets manager permissions are not assigned
    const secretsManagerStatements = PolicyDocument.Statement.filter(
      (statement: any) => statement.Action === 'secretsmanager:GetSecretValue',
    );
    expect(secretsManagerStatements.length).toEqual(0);

    const kmsStatements = PolicyDocument.Statement.filter((statement: any) => statement.Action === 'kms:Decrypt');
    expect(kmsStatements.length).toEqual(0);

    // Check that cloudwatch permissions are assigned
    const cloudWatchStatements = PolicyDocument.Statement.filter(
      (statement: any) =>
        JSON.stringify(statement.Action) === JSON.stringify(['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']),
    );
    expect(cloudWatchStatements.length).toEqual(1);
    expect(cloudWatchStatements[0].Resource).toEqual('arn:aws:logs:*:*:*');

    expect(PolicyDocument).toMatchSnapshot();

    // Check that the connection uri is passed to the lambda as an environment variable
    const [, sqlLambda] =
      Object.entries(sqlApiStack.Resources!).find(([resourceName]) => {
        return resourceName.startsWith(resourceNames.sqlLambdaFunction);
      }) || [];
    expect(sqlLambda).toBeDefined();
    const envVars = sqlLambda.Properties.Environment.Variables;
    expect(envVars).toBeDefined();
    // The connection string information that is set in the lambda environment should be a valid JSON.
    expect(envVars.connectionString).toBeDefined();
    expect(JSON.parse(envVars.connectionString)).toEqual(ssmPaths);
    expect(envVars.CREDENTIAL_STORAGE_METHOD).toEqual('SSM');
    expect(envVars.SSM_ENDPOINT).toBeDefined();
  });
});
