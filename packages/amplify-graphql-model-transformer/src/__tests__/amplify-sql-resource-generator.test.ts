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
      hostnameSsmPath: '/test/hostname',
      portSsmPath: '/test/port',
      usernameSsmPath: '/test/username',
      passwordSsmPath: '/test/password',
      databaseNameSsmPath: '/test/databaseName',
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
    expect(policy.Properties.PolicyDocument).toMatchSnapshot();
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

    const secretsManagerConfig = {
      ...mysqlStrategy,
      dbConnectionConfig: {
        databaseName: 'mydb',
        port: 3306,
        hostname: 'myfakehost',
        secretArn: 'myfakearn',
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
    expect(policy.Properties.PolicyDocument).toMatchSnapshot();
  });
});
