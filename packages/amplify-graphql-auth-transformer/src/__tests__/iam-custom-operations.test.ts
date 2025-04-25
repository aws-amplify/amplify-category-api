import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { SqlTransformer } from '@aws-amplify/graphql-sql-transformer';
import {
  constructDataSourceStrategies,
  constructSqlDirectiveDataSourceStrategies,
  DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  isSqlStrategy,
} from '@aws-amplify/graphql-transformer-core';
import {
  AppSyncAuthConfiguration,
  ModelDataSourceStrategy,
  SqlDirectiveDataSourceStrategy,
  SynthParameters,
  TransformerPluginProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { AuthTransformer } from '../graphql-auth-transformer';

const makeAuthConfig = (): AppSyncAuthConfiguration => ({
  defaultAuthentication: {
    authenticationType: 'API_KEY',
  },
  additionalAuthenticationProviders: [
    {
      authenticationType: 'AWS_IAM',
    },
    {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
  ],
});

const makeSynthParameters = (): Partial<SynthParameters> => ({
  enableIamAccess: true,
});

const makeTransformers = (): TransformerPluginProvider[] => [
  new ModelTransformer(),
  new AuthTransformer(),
  new PrimaryKeyTransformer(),
  new SqlTransformer(),
];

const makeSqlDirectiveDataSourceStrategies = (schema: string, strategy: ModelDataSourceStrategy): SqlDirectiveDataSourceStrategy[] =>
  isSqlStrategy(strategy) ? constructSqlDirectiveDataSourceStrategies(schema, strategy) : [];

const strategyTypes = ['DDB', 'SQL'] as const;

const makeStrategy = (strategyType: 'DDB' | 'SQL'): ModelDataSourceStrategy =>
  strategyType === 'SQL' ? mockSqlDataSourceStrategy() : DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY;

/**
 * Tests that custom operations always get an `@aws_iam` directive if `enableIamAuthorizationMode` (which maps to the `enableIamAccess`
 * flag) is true. In Gen 2, IAM access is globally enabled, to allow console Admin use cases, but customers do not have a way to specify it,
 * so it is expected that IAM auth is enabled by Amplify. Even if a custom operation has other auth modes, applied, `@aws_iam` should be
 * added by the transformer.
 *
 * Note:
 * - Every schema includes an explicit ID and `@primaryKey` directive, so the schema is suitable for both DDB & SQL strategies
 * - We aren't exhaustively testing every combination of auth rule and `enableIamAuthorizationMode` since we have other tests that do that.
 *   This suite is intended to ensure that aws_iam gets applied.
 */
describe('Custom operations have @aws_iam directives when enableIamAuthorizationMode is true', () => {
  describe.each(strategyTypes)('Using %s', (strategyType) => {
    test('Model is not present', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Query {
          getFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''}
        }
        type Mutation {
          updateFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''}
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      expect(out.schema).toMatch(/getFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: String.*@aws_iam/);
    });

    test('Model is not present and custom operations include an explicit auth rule from Gen 2 schema builder', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Query {
          getFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''} @aws_cognito_user_pools
        }
        type Mutation {
          updateFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''} @aws_cognito_user_pools
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"]) @aws_cognito_user_pools
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      expect(out.schema).toMatch(/getFooCustom: String.*@aws_cognito_user_pools.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: String.*@aws_cognito_user_pools.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: String.*@aws_cognito_user_pools.*@aws_iam/);
    });

    test('Model is present', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Foo @model @auth(rules: [{ allow: public }]) {
         id: ID! @primaryKey
         content: String
        }
        type Query {
          getFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''}
        }
        type Mutation {
          updateFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''}
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      expect(out.schema).toMatch(/getFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: String.*@aws_iam/);
    });

    test('Model is present and custom operations include an explicit auth rule from Gen 2 schema builder', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Foo @model @auth(rules: [{ allow: public }]) {
         id: ID! @primaryKey
         content: String
        }
        type Query {
          getFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''} @aws_cognito_user_pools
        }
        type Mutation {
          updateFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''} @aws_cognito_user_pools
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"]) @aws_cognito_user_pools
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      expect(out.schema).toMatch(/getFooCustom: String.*@aws_cognito_user_pools.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: String.*@aws_cognito_user_pools.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: String.*@aws_cognito_user_pools.*@aws_iam/);
    });

    test('Model is present but queries are disabled', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Foo @model(queries: null) @auth(rules: [{ allow: public }]) {
         id: ID! @primaryKey
         content: String
        }
        type Query {
          getFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''}
        }
        type Mutation {
          updateFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''}
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      expect(out.schema).toMatch(/getFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: String.*@aws_iam/);
    });

    test('Model is present but mutations are disabled', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Foo @model(mutations: null) @auth(rules: [{ allow: public }]) {
         id: ID! @primaryKey
         content: String
        }
        type Query {
          getFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''}
        }
        type Mutation {
          updateFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''}
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      expect(out.schema).toMatch(/getFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: String.*@aws_iam/);
    });

    test('Model is present but subscriptions are disabled', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Foo @model(subscriptions: null) @auth(rules: [{ allow: public }]) {
         id: ID! @primaryKey
         content: String
        }
        type Query {
          getFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''}
        }
        type Mutation {
          updateFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''}
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      expect(out.schema).toMatch(/getFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: String.*@aws_iam/);
    });

    test('Does not add duplicate @aws_iam directive if already present', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Query {
          getFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''} @aws_iam
        }
        type Mutation {
          updateFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''} @aws_iam
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"]) @aws_iam
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      expect(out.schema).toMatch(/getFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: String.*@aws_iam/);
      expect(out.schema).not.toMatch(/getFooCustom: String.*@aws_iam.*@aws_iam/);
      expect(out.schema).not.toMatch(/updateFooCustom: String.*@aws_iam.*@aws_iam/);
      expect(out.schema).not.toMatch(/onUpdateFooCustom: String.*@aws_iam.*@aws_iam/);
    });

    test('Adds @aws_iam directive if sandbox is enabled', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Query {
          getFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''}
        }
        type Mutation {
          updateFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''}
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        transformers: makeTransformers(),
        transformParameters: {
          sandboxModeEnabled: true,
        },
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      expect(out.schema).toMatch(/getFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: String.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: String.*@aws_iam/);
    });

    test('Does not add if neither sandbox nor enableIamAuthorizationMode is enabled', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Query {
          getFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''}
        }
        type Mutation {
          updateFooCustom: String ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''}
        }
        type Subscription {
          onUpdateFooCustom: String @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      expect(out.schema).not.toMatch(/getFooCustom: String.*@aws_iam/);
      expect(out.schema).not.toMatch(/updateFooCustom: String.*@aws_iam/);
      expect(out.schema).not.toMatch(/onUpdateFooCustom: String.*@aws_iam/);
    });

    test('Adds @aws_iam to non-model custom types when there is no model', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Foo {
          description: String
        }
        type Query {
          getFooCustom: Foo
        }
        type Mutation {
          updateFooCustom: Foo
        }
        type Subscription {
          onUpdateFooCustom: Foo @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      // Expect the custom operations to be authorized
      expect(out.schema).toMatch(/getFooCustom: Foo.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: Foo.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: Foo.*@aws_iam/);

      // Also expect the custom type referenced by the custom operation to be authorized
      expect(out.schema).toMatch(/type Foo.*@aws_iam/);
    });

    test('Adds @aws_iam to non-model custom types when there is a model', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Todo @model {
          id: ID! @primaryKey
          done: Boolean
        }
        type Foo {
          description: String
        }
        type Query {
          getFooCustom: Foo
        }
        type Mutation {
          updateFooCustom: Foo
        }
        type Subscription {
          onUpdateFooCustom: Foo @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      // Expect the custom operations to be authorized
      expect(out.schema).toMatch(/getFooCustom: Foo.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: Foo.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: Foo.*@aws_iam/);

      // Also expect the custom type referenced by the custom operation to be authorized
      expect(out.schema).toMatch(/type Foo.*@aws_iam/);
    });

    test('Adds @aws_iam to non-model custom types when there is some other auth directive on the field', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Foo {
          description: String @auth(rules: [{ allow: groups, groups: ["ZZZ_DOES_NOT_EXIST"] }])
        }
        type Query {
          getFooCustom: Foo
        }
        type Mutation {
          updateFooCustom: Foo
        }
        type Subscription {
          onUpdateFooCustom: Foo @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      // Expect the custom operations to be authorized
      expect(out.schema).toMatch(/getFooCustom: Foo.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: Foo.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: Foo.*@aws_iam/);

      // Also expect the custom type referenced by the custom operation to be authorized
      expect(out.schema).toMatch(/description: String.*@aws_iam/);
    });

    test('Does not add duplicate @aws_iam directive to custom type if already present', () => {
      const strategy = makeStrategy(strategyType);
      const schema = /* GraphQL */ `
        type Foo @aws_iam {
          description: String
        }
        type Query {
          getFooCustom: Foo ${isSqlStrategy(strategy) ? '@sql(statement: "SELECT 1")' : ''}
        }
        type Mutation {
          updateFooCustom: Foo ${isSqlStrategy(strategy) ? '@sql(statement: "UPDATE FOO set content=1")' : ''}
        }
        type Subscription {
          onUpdateFooCustom: Foo @aws_subscribe(mutations: ["updateFooCustom"])
        }
      `;

      const out = testTransform({
        schema,
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
        authConfig: makeAuthConfig(),
        synthParameters: makeSynthParameters(),
        transformers: makeTransformers(),
        sqlDirectiveDataSourceStrategies: makeSqlDirectiveDataSourceStrategies(schema, strategy),
      });

      // Expect the custom operations to be authorized
      expect(out.schema).toMatch(/getFooCustom: Foo.*@aws_iam/);
      expect(out.schema).toMatch(/updateFooCustom: Foo.*@aws_iam/);
      expect(out.schema).toMatch(/onUpdateFooCustom: Foo.*@aws_iam/);

      // Also expect the custom type referenced by the custom operation to be authorized
      expect(out.schema).toMatch(/type Foo.*@aws_iam/);
      expect(out.schema).not.toMatch(/type Foo.*@aws_iam.*@aws_iam/);
    });
  });
});
