/*
 * The purpose of these tests is to give early warning of unexpected changes in resolver generation. These don't actually do much in the way
 * of testing functionality, but rather act as smoke tests to make sure we are alerted as early as possible to changes in the generated
 * resolver code and stack resources.
 *
 * NOTE: These tests use fake timers to fix the system time returned by `Date.now` and other calls. Any routines that rely on time to
 * actually pass will fail. As of this writing, this works as expected, but be aware of the behavior.
 */

import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FunctionTransformer } from '@aws-amplify/graphql-function-transformer';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { SqlTransformer } from '@aws-amplify/graphql-sql-transformer';
import { AuthTransformer } from '../../graphql-auth-transformer';
import {
  TestTable,
  convertToTestArgumentArray,
  ddbDataSourceStrategies,
  makeTransformationExpectation,
  sqlDataSourceStrategies,
  testRules,
} from './snapshot-utils';

const schemas = {
  customMutations: {
    ddb: /* GraphQL */ `
      type Mutation {
        setFoo(foo: Int!): [Int] @function(name: "setFoo") @auth(rules: [ <FIELD_AUTH_RULE> ])
      }
    `,
    sql: /* GraphQL */ `
      type Mutation {
        setFoo(foo: Int!): [Int] @sql(statement: "UPDATE Foo SET foo = 1; SELECT 1") @auth(rules: [ <FIELD_AUTH_RULE> ])
      }
    `,
  },
  customQueries: {
    ddb: /* GraphQL */ `
      type Query {
        getFoo: [Int] @function(name: "getFoo") @auth(rules: [ <FIELD_AUTH_RULE> ])
      }
    `,
    sql: /* GraphQL */ `
      type Mutation {
        getFoo: [Int] @sql(statement: "SELECT foo FROM Foo") @auth(rules: [ <FIELD_AUTH_RULE> ])
      }
    `,
  },
};

const operations = ['create', 'update', 'delete', /* 'read', */ 'get', 'list', 'sync', 'listen', 'search'];

describe('Auth operation combinations: custom mutations', () => {
  beforeEach(() => {
    // Fix all Date.now() calls to 1704067200000 epoch milliseconds
    const fakeDate = Date.UTC(2024, 0, 1, 0, 0, 0);
    jest.useFakeTimers('modern');
    jest.setSystemTime(fakeDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('DDB data sources', () => {
    const makeTransformers: () => TransformerPluginProvider[] = () => [
      new ModelTransformer(),
      new AuthTransformer(),
      new FunctionTransformer(),
    ];
    const mutationExpectation = makeTransformationExpectation(ddbDataSourceStrategies, schemas.customMutations.ddb, makeTransformers);
    const queryExpectation = makeTransformationExpectation(ddbDataSourceStrategies, schemas.customQueries.ddb, makeTransformers);

    const testTable: TestTable = [];
    for (const strategyName of Object.keys(ddbDataSourceStrategies)) {
      for (const fieldRuleName of Object.keys(testRules)) {
        for (const operation of operations) {
          const expectedErrorMessage = ['get', 'list', 'sync', 'listen', 'search'].includes(operation)
            ? `'${operation}' operation is not allowed at the field level.`
            : "@auth rules on fields within Query, Mutation, Subscription cannot specify 'operations' argument as these rules are already on an operation already.";
          testTable.push(
            convertToTestArgumentArray({
              strategyName,
              fieldRuleName,
              fieldRuleExt: `, operations: [${operation}]`,
              modelRuleName: undefined,
              modelRuleExt: undefined,
              expectedErrorMessage,
            }),
          );
        }
      }
    }

    test.each(testTable)('custom mutation - %s - %s%s - %s%s should fail', mutationExpectation);
    test.each(testTable)('custom query - %s - %s%s - %s%s should fail', queryExpectation);
  });

  describe('SQL data sources', () => {
    const makeTransformers: () => TransformerPluginProvider[] = () => [
      new ModelTransformer(),
      new AuthTransformer(),
      new PrimaryKeyTransformer(),
      new SqlTransformer(),
    ];

    const mutationExpectation = makeTransformationExpectation(sqlDataSourceStrategies, schemas.customMutations.sql, makeTransformers);
    const queryExpectation = makeTransformationExpectation(sqlDataSourceStrategies, schemas.customQueries.sql, makeTransformers);

    const testTable: TestTable = [];
    for (const strategyName of Object.keys(sqlDataSourceStrategies)) {
      for (const fieldRuleName of Object.keys(testRules)) {
        for (const operation of operations) {
          const expectedErrorMessage = ['get', 'list', 'sync', 'listen', 'search'].includes(operation)
            ? `'${operation}' operation is not allowed at the field level.`
            : "@auth rules on fields within Query, Mutation, Subscription cannot specify 'operations' argument as these rules are already on an operation already.";
          testTable.push(
            convertToTestArgumentArray({
              strategyName,
              fieldRuleName,
              fieldRuleExt: `, operations: [${operation}]`,
              modelRuleName: undefined,
              modelRuleExt: undefined,
              expectedErrorMessage,
            }),
          );
        }
      }
    }

    test.each(testTable)('custom mutation - %s - %s%s - %s%s should fail', mutationExpectation);
    test.each(testTable)('custom query - %s - %s%s - %s%s should fail', queryExpectation);
  });
});
