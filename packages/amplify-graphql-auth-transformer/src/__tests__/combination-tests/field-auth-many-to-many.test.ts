import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { HasOneTransformer, ManyToManyTransformer } from '@aws-amplify/graphql-relational-transformer';
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
  type Post @model {
    id: ID!
    title: String!
    content: String
    tags: [Tag] @manyToMany(relationName: "PostTags")
  }

  type Tag @model {
    id: ID!
    label: String!
    posts: [Post] @manyToMany(relationName: "PostTags")
  }
`;

const sqlSchemaTemplate = /* GraphQL */ `
  type Post @model @auth(rules: [<MODEL_AUTH_RULE>]) {
    id: ID! @auth(rules: [ <MODEL_AUTH_RULE>, <FIELD_AUTH_RULE> ]) @primaryKey
    description: String
    tags: [Tag] @manyToMany(relationName: "PostTags") @auth(rules: [ <FIELD_AUTH_RULE> ])
  }

  type Tag @model @auth(rules: [<MODEL_AUTH_RULE>]) {
    id: ID! @auth(rules: [ <MODEL_AUTH_RULE>, <FIELD_AUTH_RULE> ]) @primaryKey
    label: String
    posts: [Post] @manyToMany(relationName: "PostTags") @auth(rules: [ <FIELD_AUTH_RULE> ])
  }
`;

describe('Auth field-level auth combinations: manyToMany', () => {
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
    const makeTransformers: () => TransformerPluginProvider[] = () => {
      const modelTransformer = new ModelTransformer();
      const indexTransformer = new IndexTransformer();
      const hasOneTransformer = new HasOneTransformer();
      const authTransformer = new AuthTransformer();
      const manyToManyTransformer = new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer);
      return [modelTransformer, authTransformer, indexTransformer, hasOneTransformer, manyToManyTransformer];
    };
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
    const makeTransformers: () => TransformerPluginProvider[] = () => {
      const modelTransformer = new ModelTransformer();
      const indexTransformer = new IndexTransformer();
      const hasOneTransformer = new HasOneTransformer();
      const authTransformer = new AuthTransformer();
      const manyToManyTransformer = new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer);
      return [modelTransformer, authTransformer, indexTransformer, hasOneTransformer, manyToManyTransformer, new PrimaryKeyTransformer()];
    };
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
            expectedErrorMessage:
              '@auth rules are not supported on fields on relational database models. Check field "id" on type "Post". Please use @auth on the type instead.',
          }),
        );
      }
    }

    test.each(testTable)('%s - %s - %s should fail', expectation);
  });
});
