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
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { AuthTransformer } from '../../graphql-auth-transformer';
import {
  TestTable,
  convertToTestArgumentArray,
  ddbDataSourceStrategies,
  makeTransformationExpectation,
  sqlDataSourceStrategies,
  testRules,
} from './snapshot-utils';

const ddbSchemaTemplate = /* GraphQL */ `
  type Post @model @auth(rules: [ <MODEL_AUTH_RULE> ]) {
    id: ID!
    description: String
  }
`;

const sqlSchemaTemplate = /* GraphQL */ `
  type Post @model @auth(rules: [ <MODEL_AUTH_RULE> ]) {
    id: ID! @primaryKey
    description: String
  }
`;

const operations = ['create', 'update', 'delete', 'read', 'get', 'list', 'sync', 'listen', 'search'];

describe('Auth operation combinations: model', () => {
  beforeEach(() => {
    // Fix all Date.now() calls to 1704067200000 epoch milliseconds
    const fakeDate = Date.UTC(2024, 0, 1, 0, 0, 0);
    jest.useFakeTimers();
    jest.setSystemTime(fakeDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('DDB data sources', () => {
    const makeTransformers: () => TransformerPluginProvider[] = () => [new ModelTransformer(), new AuthTransformer()];
    const expectation = makeTransformationExpectation(ddbDataSourceStrategies, ddbSchemaTemplate, makeTransformers);

    const testTable: TestTable = [];
    for (const strategyName of Object.keys(ddbDataSourceStrategies)) {
      for (const modelRuleName of Object.keys(testRules)) {
        for (const operation of operations) {
          testTable.push(
            convertToTestArgumentArray({
              strategyName,
              fieldRuleName: undefined,
              fieldRuleExt: undefined,
              modelRuleName,
              modelRuleExt: `, operations: [${operation}]`,
            }),
          );
        }
      }
    }

    test.each(testTable)('%s - %s%s - %s%s should pass', expectation);
  });

  describe('SQL data sources', () => {
    const unsupportedOperations = ['sync', 'search'];

    const makeTransformers: () => TransformerPluginProvider[] = () => [
      new ModelTransformer(),
      new AuthTransformer(),
      new PrimaryKeyTransformer(),
    ];

    const expectation = makeTransformationExpectation(sqlDataSourceStrategies, sqlSchemaTemplate, makeTransformers);

    const supportedOperationsTestTable: TestTable = [];
    const unsupportedOperationsTestTable: TestTable = [];
    for (const strategyName of Object.keys(sqlDataSourceStrategies)) {
      for (const modelRuleName of Object.keys(testRules)) {
        for (const operation of operations.filter((o) => !unsupportedOperations.includes(o))) {
          supportedOperationsTestTable.push(
            convertToTestArgumentArray({
              strategyName,
              fieldRuleName: undefined,
              fieldRuleExt: undefined,
              modelRuleName,
              modelRuleExt: `, operations: [${operation}]`,
            }),
          );
        }
        for (const operation of unsupportedOperations) {
          const expectedErrorMessage = `@auth on Post cannot specify '${operation}' operation as it is not supported for SQL data sources`;
          unsupportedOperationsTestTable.push(
            convertToTestArgumentArray({
              strategyName,
              fieldRuleName: undefined,
              fieldRuleExt: undefined,
              modelRuleName,
              modelRuleExt: `, operations: [${operation}]`,
              expectedErrorMessage,
            }),
          );
        }
      }
    }

    test.each(supportedOperationsTestTable)('%s - %s%s - %s%s should pass', expectation);
    test.each(unsupportedOperationsTestTable)('%s - %s%s - %s%s should fail', expectation);
  });
});
