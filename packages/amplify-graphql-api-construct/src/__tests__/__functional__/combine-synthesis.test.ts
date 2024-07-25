import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, DDB_DEFAULT_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy, SCHEMAS } from '@aws-amplify/graphql-transformer-test-utils';
import { IConstruct } from 'constructs';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { makeApiByCombining } from './test-utils';

describe('AmplifyGraphqlDefinition.combine synthesis behavior', () => {
  /**
   * This is technically redundant, since we assert on the function names in tests below. We're keeping this as a separate test to capture
   * the scoping requirements for resources created for a data source.
   */
  it('creates SQL resources named after the associated ModelDataSourceStrategy', () => {
    const sqlstrategy1 = mockSqlDataSourceStrategy({
      name: 'sqlstrategy1',
      sqlLambdaProvisionedConcurrencyConfig: { provisionedConcurrentExecutions: 10 },
    });
    const sqlstrategy2 = mockSqlDataSourceStrategy({
      name: 'sqlstrategy2',
      sqlLambdaProvisionedConcurrencyConfig: { provisionedConcurrentExecutions: 10 },
    });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.order.sql, sqlstrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.lineItem.sql, sqlstrategy2);
    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { additionalCfnResources, cfnDataSources },
        functions,
        nestedStacks,
        roles,
      },
    } = api;

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(2);

    // Expect one 'SQLApiStack' per strategy
    expect(nestedStacks).toBeDefined();
    expect(nestedStacks['SQLApiStacksqlstrategy1']).toBeDefined();
    expect(nestedStacks['SQLApiStacksqlstrategy2']).toBeDefined();

    // Expect one SQL Lambda function per strategy
    expect(functions).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy2']).toBeDefined();

    // Expect one data source per strategy
    expect(cfnDataSources).toBeDefined();
    expect(cfnDataSources['SQLLambdaDataSourcesqlstrategy1']).toBeDefined();
    expect(cfnDataSources['SQLLambdaDataSourcesqlstrategy2']).toBeDefined();

    // Expect one SQL lambda alias per strategy if provisioned concurrency is configured
    expect(additionalCfnResources).toBeDefined();
    expect(additionalCfnResources['SQLFunctionsqlstrategy1ProvConcurAlias']).toBeDefined();
    expect(additionalCfnResources['SQLFunctionsqlstrategy2ProvConcurAlias']).toBeDefined();

    // Expect one patching lambda function per strategy
    expect(functions['SQLLambdaLayerPatchingFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLLambdaLayerPatchingFunctionsqlstrategy2']).toBeDefined();

    // Expect one SQL lambda execution role and one patching lambda execution role per strategy
    expect(roles).toBeDefined();
    expect(roles['SQLLambdaRolesqlstrategy1']).toBeDefined();
    expect(roles['SQLLambdaRolesqlstrategy2']).toBeDefined();
    expect(roles['SQLPatchingLambdaRolesqlstrategy1']).toBeDefined();
    expect(roles['SQLPatchingLambdaRolesqlstrategy2']).toBeDefined();

    // Expect one SQL layer version resolver custom resource per strategy. Since AwsCustomResources aren't CfnResources, they don't appear
    // in the api resources stack. We can add them later if it is useful for customers, but for now, we'll assert existence by finding the
    // resource ID in the construct tree
    expect(tryFindChildRecursive(api, 'SQLLayerVersionCustomResourcesqlstrategy1')).toBeDefined();
    expect(tryFindChildRecursive(api, 'SQLLayerVersionCustomResourcesqlstrategy2')).toBeDefined();
  });

  it('combines homogenous independent DDB default definitions', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.ddb, DDB_DEFAULT_DATASOURCE_STRATEGY);
    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(2);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(0);

    expect(functions).toMatchObject({});
  });

  it('combines homogenous related gen1 DDB default definitions', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.order.ddb);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.lineItem.ddb, DDB_DEFAULT_DATASOURCE_STRATEGY);
    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(2);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(0);

    expect(functions).toMatchObject({});
  });

  it('combines homogenous related gen2 DDB default definitions', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.order.ddbGen2);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.lineItem.ddbGen2, DDB_DEFAULT_DATASOURCE_STRATEGY);
    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(2);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(0);

    expect(functions).toMatchObject({});
  });

  it('combines homogenous independent DDB Amplify-managed table definitions', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(2);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(0);

    expect(functions).toMatchObject({});
  });

  it('combines homogenous related DDB Amplify-managed table definitions using gen1 style relationships', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.order.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.lineItem.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(2);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(0);

    expect(functions).toMatchObject({});
  });

  it('combines homogenous related DDB Amplify-managed table definitions using gen2 style relationships', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.order.ddbGen2, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.lineItem.ddbGen2, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(2);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(0);

    expect(functions).toMatchObject({});
  });

  it('combines heterogeneous independent SQL table definitions', () => {
    const sqlstrategy1 = mockSqlDataSourceStrategy({ name: 'sqlstrategy1' });
    const sqlstrategy2 = mockSqlDataSourceStrategy({ name: 'sqlstrategy2', dbType: 'POSTGRES' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlstrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.sql, sqlstrategy2);
    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(0);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(2);

    // Expect one SQL Lambda function per strategy
    expect(functions).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy2']).toBeDefined();
  });

  it('combines heterogeneous related SQL table definitions', () => {
    const sqlstrategy1 = mockSqlDataSourceStrategy({ name: 'sqlstrategy1' });
    const sqlstrategy2 = mockSqlDataSourceStrategy({ name: 'sqlstrategy2' });
    const sqlstrategy3 = mockSqlDataSourceStrategy({ name: 'sqlstrategy3', dbType: 'POSTGRES' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.blog.sql, sqlstrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.post.sql, sqlstrategy2);
    const definition3 = AmplifyGraphqlDefinition.fromString(SCHEMAS.comment.sql, sqlstrategy3);
    const api = makeApiByCombining(definition1, definition2, definition3);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(0);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(3);

    // Expect one SQL Lambda function per strategy
    expect(functions).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy2']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy3']).toBeDefined();
  });

  it('combines heterogeneous independent definitions for multiple supported db types', () => {
    const sqlstrategy1 = mockSqlDataSourceStrategy({ name: 'sqlstrategy1' });
    const sqlstrategy2 = mockSqlDataSourceStrategy({ name: 'sqlstrategy2' });
    const ddbdefinition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
    const ddbdefinition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const sqldefinition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo3.sql, sqlstrategy1);
    const sqldefinition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo4.sql, sqlstrategy2);
    const api = makeApiByCombining(ddbdefinition1, ddbdefinition2, sqldefinition1, sqldefinition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(2);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(2);

    // Expect one SQL Lambda function per strategy
    expect(functions).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy2']).toBeDefined();
  });

  it('combines heterogeneous definitions with relationships that do not cross the DDB/SQL boundary', () => {
    const sqlstrategy1 = mockSqlDataSourceStrategy({ name: 'sqlstrategy1' });
    const sqlstrategy2 = mockSqlDataSourceStrategy({ name: 'sqlstrategy2' });
    const ddbdefinition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
    const sqldefinition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.order.sql, sqlstrategy1);
    const sqldefinition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.lineItem.sql, sqlstrategy2);
    const api = makeApiByCombining(ddbdefinition1, sqldefinition1, sqldefinition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(1);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(2);

    // Expect one SQL Lambda function per strategy
    expect(functions).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy2']).toBeDefined();
  });

  it('combines heterogeneous definitions with relationships that do cross the DDB/SQL boundary', () => {
    const sqlstrategy1 = mockSqlDataSourceStrategy({ name: 'sqlstrategy1' });
    const sqlstrategy2 = mockSqlDataSourceStrategy({ name: 'sqlstrategy2' });
    const ddbdefinition = AmplifyGraphqlDefinition.fromString(SCHEMAS.blog.ddbGen2);
    const sqldefinition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.post.sql, sqlstrategy1);
    const sqldefinition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.comment.sql, sqlstrategy2);
    const api = makeApiByCombining(ddbdefinition, sqldefinition1, sqldefinition2);
    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(1);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(2);

    // Expect one SQL Lambda function per strategy
    expect(functions).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy2']).toBeDefined();
  });

  // We could technically implement checks for some of these in the `combine` factory method itself, but it would be a fairly naive check
  // matching only the declared model name. Instead, we'll catch this during transformation, so that the transformer validations can catch
  // things like remapped names.
  it('fails if a model is shared across DynamoDB definitions', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    expect(() => makeApiByCombining(definition1, definition2)).toThrow();
  });

  it('fails if a model is shared across SQL definitions', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy2);
    expect(() => makeApiByCombining(definition1, definition2)).toThrow();
  });

  it('fails if a model is shared across DynamoDB/SQL definitions', () => {
    const ddbdefinition = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqldefinition = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy1);
    expect(() => makeApiByCombining(ddbdefinition, sqldefinition)).toThrow();
  });

  it('supports definitions with both models and custom SQL statements', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlstrategy1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({
      name: 'sqlstrategy2',
      dbType: 'POSTGRES',
      customSqlStatements: {
        customSqlQueryReference: 'SELECT 1',
      },
    });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryReference, sqlStrategy2);

    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(0);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(2);

    // Expect one SQL Lambda function per strategy
    expect(functions).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy2']).toBeDefined();
  });

  it('supports Query definitions split amongst heterogeneous definitions', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlstrategy1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({
      name: 'sqlstrategy2',
      customSqlStatements: {
        customSqlQueryReference: 'SELECT 1',
      },
    });
    const sqlStrategy3 = mockSqlDataSourceStrategy({
      name: 'sqlstrategy3',
      customSqlStatements: {
        customSqlMutationReference: 'UPDATE mytable SET id=1; SELECT 1',
      },
    });
    const schema3 = SCHEMAS.todo.sql + '\n' + SCHEMAS.customSqlMutationReference;

    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryStatement, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryReference, sqlStrategy2);
    const definition3 = AmplifyGraphqlDefinition.fromString(schema3, sqlStrategy3);

    const api = makeApiByCombining(definition1, definition2, definition3);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(0);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(3);

    // Expect one SQL Lambda function per strategy
    expect(functions).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy2']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy3']).toBeDefined();
  });

  it('supports definitions with only custom SQL statements', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({
      name: 'sqlstrategy1',
      customSqlStatements: {
        customSqlMutationReference: 'UPDATE Todo SET id=1; SELECT 1',
      },
    });
    const sqlStrategy2 = mockSqlDataSourceStrategy({
      name: 'sqlstrategy2',
      customSqlStatements: {
        customSqlQueryReference: 'SELECT 1',
      },
    });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlMutationReference, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryReference, sqlStrategy2);

    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
        functions,
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(0);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(2);

    // Expect one SQL Lambda function per strategy
    expect(functions).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLFunctionsqlstrategy2']).toBeDefined();
  });
});

/**
 * Recurses through the node tree to locate the specified ID. Returns undefined if not found.
 */
const tryFindChildRecursive = (construct: IConstruct, id: string): IConstruct | undefined => {
  if (construct.node.id === id) {
    return construct;
  }
  for (const child of construct.node.children) {
    const found = tryFindChildRecursive(child, id);
    if (found) {
      return found;
    }
  }

  return undefined;
};
