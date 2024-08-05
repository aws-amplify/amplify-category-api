import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import { TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { AuthTransformer } from '../../graphql-auth-transformer';
import {
  convertToTestArgumentArray,
  ddbDataSourceStrategies,
  makeTransformationExpectation,
  sqlDataSourceStrategies,
  testRules,
  TestTable,
} from './snapshot-utils';

const ddbSchemaTemplate = /* GraphQL */ `
  type Person @model @auth(rules: [<MODEL_AUTH_RULE>]) {
    id: ID! @auth(rules: [ <MODEL_AUTH_RULE>, <FIELD_AUTH_RULE> ])
    name: String
    passport: Passport @hasOne @auth(rules: [ <FIELD_AUTH_RULE> ])
  }

  type Passport @model @auth(rules: [<MODEL_AUTH_RULE>]) {
    id: ID! @auth(rules: [ <MODEL_AUTH_RULE>, <FIELD_AUTH_RULE> ])
    personId: ID! @auth(rules: [ <MODEL_AUTH_RULE>, <FIELD_AUTH_RULE> ])
    person: Person @belongsTo @auth(rules: [ <FIELD_AUTH_RULE> ])
  }
`;

const sqlSchemaTemplate = /* GraphQL */ `
  type Person @model @auth(rules: [<MODEL_AUTH_RULE>]) {
    id: ID! @auth(rules: [ <MODEL_AUTH_RULE>, <FIELD_AUTH_RULE> ]) @primaryKey
    name: String
    passport: Passport @hasOne(references: "personId") @auth(rules: [ <FIELD_AUTH_RULE> ])
  }

  type Passport @model @auth(rules: [<MODEL_AUTH_RULE>]) {
    id: ID! @auth(rules: [ <MODEL_AUTH_RULE>, <FIELD_AUTH_RULE> ]) @primaryKey
    personId: ID! @auth(rules: [ <MODEL_AUTH_RULE>, <FIELD_AUTH_RULE> ])
    person: Person @belongsTo(references: "personId") @auth(rules: [ <FIELD_AUTH_RULE> ])
  }
`;

describe('Auth field-level auth combinations: hasOne/belongsTo', () => {
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
      new HasOneTransformer(),
      new BelongsToTransformer(),
    ];
    const expectation = makeTransformationExpectation(ddbDataSourceStrategies, ddbSchemaTemplate, makeTransformers);

    const testTable: TestTable = [];
    for (const strategyName of Object.keys(ddbDataSourceStrategies)) {
      for (const fieldRuleName of Object.keys(testRules)) {
        const modelRuleName =
          fieldRuleName === 'owner, userPools, implicit owner field' ? 'owner, oidc, implicit owner field' : fieldRuleName;
        testTable.push(
          convertToTestArgumentArray({
            strategyName,
            fieldRuleName,
            fieldRuleExt: undefined,
            modelRuleName,
            modelRuleExt: undefined,
          }),
        );
      }
    }

    test.each(testTable)('%s - %s should pass', expectation);
  });

  describe('SQL data sources', () => {
    const makeTransformers: () => TransformerPluginProvider[] = () => [
      new ModelTransformer(),
      new AuthTransformer(),
      new HasOneTransformer(),
      new BelongsToTransformer(),
      new PrimaryKeyTransformer(),
    ];
    const expectation = makeTransformationExpectation(sqlDataSourceStrategies, sqlSchemaTemplate, makeTransformers);

    const testTable: TestTable = [];
    for (const strategyName of Object.keys(sqlDataSourceStrategies)) {
      for (const fieldRuleName of Object.keys(testRules)) {
        const modelRuleName =
          fieldRuleName === 'owner, userPools, implicit owner field' ? 'owner, oidc, implicit owner field' : fieldRuleName;
        testTable.push(
          convertToTestArgumentArray({
            strategyName,
            fieldRuleName,
            fieldRuleExt: undefined,
            modelRuleName,
            modelRuleExt: undefined,
          }),
        );
      }
    }

    test.each(testTable)('%s - %s - %s should fail', expectation);
  });
});
