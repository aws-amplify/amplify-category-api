import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, DDB_DEFAULT_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy, SCHEMAS } from '@aws-amplify/graphql-transformer-test-utils';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { IAmplifyGraphqlDefinition } from '../../types';

describe('AmplifyGraphqlDefinition.combine synthesis behavior', () => {
  const makeApiByCombining = (...definitions: IAmplifyGraphqlDefinition[]): AmplifyGraphqlApi => {
    const combinedDefinition = AmplifyGraphqlDefinition.combine(definitions);
    const stack = new cdk.Stack();
    const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
      definition: combinedDefinition,
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });
    return api;
  };

  /**
   * This is technically redundant, since we assert on the function names in tests below. We're keeping this as a separate test to capture
   * the scoping requirements for resources created for a data source.
   */
  it('creates SQL resources named after the associated ModelDataSourceStrategy, except for the Lambda layer custom resource', () => {
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

    // TODO: Expect one 'SqlApiStack' per strategy
    expect(nestedStacks).toBeDefined();
    expect(nestedStacks['SqlApiStacksqlstrategy1']).toBeDefined();
    expect(nestedStacks['SqlApiStacksqlstrategy2']).toBeDefined();

    // Expect one SQL Lambda function per strategy
    expect(functions).toBeDefined();
    expect(functions['SQLLambdaFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLLambdaFunctionsqlstrategy2']).toBeDefined();

    // Expect one data source per strategy
    expect(cfnDataSources).toBeDefined();
    expect(cfnDataSources['SQLLambdaDataSourcesqlstrategy1']).toBeDefined();
    expect(cfnDataSources['SQLLambdaDataSourcesqlstrategy2']).toBeDefined();

    // TODO: Expect one SQL lambda alias per strategy if provisioned concurrency is configured
    expect(additionalCfnResources).toBeDefined();
    expect(additionalCfnResources['SQLLambdaAliassqlstrategy1']).toBeDefined();
    expect(additionalCfnResources['SQLLambdaAliassqlstrategy2']).toBeDefined();

    // TODO: Expect one patching lambda function per strategy
    expect(functions['SQLPatchingLambdasqlstrategy1']).toBeDefined();
    expect(functions['SQLPatchingLambdasqlstrategy2']).toBeDefined();

    // TODO: Expect one SQL lambda execution role and one patching lambda execution role per strategy
    expect(roles).toBeDefined();
    expect(roles['SQLLambdaIAMRolesqlstrategy1']).toBeDefined();
    expect(roles['SQLLambdaIAMRolesqlstrategy2']).toBeDefined();
    expect(roles['SQLPatchingLambdaIAMRolesqlstrategy1']).toBeDefined();
    expect(roles['SQLPatchingLambdaIAMRolesqlstrategy2']).toBeDefined();

    // TODO: Expect one SQL layer version resolver custom resource per strategy. Since AwsCustomResources aren't CfnResources, they don't
    // appear in the api resources stack. We can add them later if it seems useful for customers, but for now, we'll assert existence by
    // finding the resource ID in the construct tree
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

  it('combines homogenous related DDB default definitions', () => {
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

  it('combines homogenous related DDB Amplify-managed table definitions', () => {
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
    expect(functions['SQLLambdaFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLLambdaFunctionsqlstrategy2']).toBeDefined();
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
    expect(functions['SQLLambdaFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLLambdaFunctionsqlstrategy2']).toBeDefined();
    expect(functions['SQLLambdaFunctionsqlstrategy3']).toBeDefined();
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
    expect(functions['SQLLambdaFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLLambdaFunctionsqlstrategy2']).toBeDefined();
  });

  it('combines heterogeneous definitions as long as relationships do not cross the DDB/SQL boundary', () => {
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
    expect(functions['SQLLambdaFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLLambdaFunctionsqlstrategy2']).toBeDefined();
  });

  it('fails to combine heterogeneous related definitions for multiple supported db types', () => {
    const sqlstrategy1 = mockSqlDataSourceStrategy({ name: 'sqlstrategy1' });
    const sqlstrategy2 = mockSqlDataSourceStrategy({ name: 'sqlstrategy2' });
    const ddbdefinition = AmplifyGraphqlDefinition.fromString(SCHEMAS.blog.ddb);
    const sqldefinition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.post.sql, sqlstrategy1);
    const sqldefinition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.comment.sql, sqlstrategy2);
    expect(() => makeApiByCombining(ddbdefinition, sqldefinition1, sqldefinition2)).toThrow();
  });

  // We could technically implement checks for some of these in the `combine` factory method itself, but it would be a fairly naive check
  // matching the declared model name. Instead, we'll catch this during transformation, so that the `refersTo` transformer can validate
  // mapped model names.
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

  it('allows a many-to-many relationship across DynamoDB definitions', () => {
    const postSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String!
        content: String
        tags: [Tag] @manyToMany(relationName: "PostTags")
      }
    `;

    const tagSchema = /* GraphQL */ `
      type Tag @model {
        id: ID!
        label: String!
        posts: [Post] @manyToMany(relationName: "PostTags")
      }
    `;
    const definition1 = AmplifyGraphqlDefinition.fromString(postSchema);
    const definition2 = AmplifyGraphqlDefinition.fromString(tagSchema, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const api = makeApiByCombining(definition1, definition2);

    const {
      resources: {
        cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
      },
    } = api;

    expect(cfnGraphqlApi).toBeDefined();
    expect(cfnGraphqlSchema).toBeDefined();
    expect(cfnApiKey).toBeDefined();
    expect(cfnDataSources).toBeDefined();

    const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AMAZON_DYNAMODB');
    expect(ddbDataSources.length).toEqual(3);

    const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
    expect(lambdaDataSources.length).toEqual(0);
  });

  it('fails if a many-to-many relationship is declared across a DDB/SQL boundary', () => {
    const postSchemaDdb = /* GraphQL */ `
      type Post @model {
        id: ID! @primaryKey
        title: String!
        content: String
        tags: [Tag] @manyToMany(relationName: "PostTags")
      }
    `;

    const tagSchemaSql = /* GraphQL */ `
      type Tag @model {
        id: ID! @primaryKey
        label: String!
        posts: [Post] @manyToMany(relationName: "PostTags")
      }
    `;
    const ddbdefinition = AmplifyGraphqlDefinition.fromString(postSchemaDdb);
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqldefinition = AmplifyGraphqlDefinition.fromString(tagSchemaSql, sqlStrategy1);
    expect(() => makeApiByCombining(ddbdefinition, sqldefinition)).toThrow();
  });

  it('fails if a many-to-many relationship is declared across a SQL boundary', () => {
    const postSchemaSql = /* GraphQL */ `
      type Post @model {
        id: ID! @primaryKey
        title: String!
        content: String
        tags: [Tag] @manyToMany(relationName: "PostTags")
      }
    `;

    const tagSchemaSql = /* GraphQL */ `
      type Tag @model {
        id: ID! @primaryKey
        label: String!
        posts: [Post] @manyToMany(relationName: "PostTags")
      }
    `;
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(postSchemaSql, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(tagSchemaSql, sqlStrategy2);
    expect(() => makeApiByCombining(definition1, definition2)).toThrow();
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
    expect(functions['SQLLambdaFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLLambdaFunctionsqlstrategy2']).toBeDefined();
  });

  it('supports Query definitions split amongst heterogeneous definitions', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlstrategy1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({
      name: 'sqlstrategy2',
      customSqlStatements: {
        customSqlQueryReference: 'SELECT 1',
      },
    });
    const schema2 = /* GraphQL */ `
      type Query {
        customSqlQueryReference: [Int] @sql(reference: "customSqlQueryReference")
      }
    `;

    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryStatement, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(schema2, sqlStrategy2);

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
    expect(functions['SQLLambdaFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLLambdaFunctionsqlstrategy2']).toBeDefined();
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
    expect(functions['SQLLambdaFunctionsqlstrategy1']).toBeDefined();
    expect(functions['SQLLambdaFunctionsqlstrategy2']).toBeDefined();
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
