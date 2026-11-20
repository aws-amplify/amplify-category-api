import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { SearchableModelTransformer } from '@aws-amplify/graphql-searchable-transformer';
import { ConflictHandlerType, constructDataSourceStrategies } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { AuthTransformer } from '../graphql-auth-transformer';

const authConfig: AppSyncAuthConfiguration = {
  defaultAuthentication: {
    authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    userPoolConfig: { userPoolId: 'TEST_USER_POOL_ID' },
  },
  additionalAuthenticationProviders: [{ authenticationType: 'API_KEY' }],
};

const modelRules: Record<string, string> = {
  userPools: 'allow: private',
  apiKey: 'allow: public, provider: apiKey',
};

const transformDynamoModel = (rule: string, operation: string): ReturnType<typeof testTransform> => {
  const searchable = operation === 'search';
  const schema = `
    type Item @model ${searchable ? '@searchable' : ''} @auth(rules: [{ ${rule}, operations: [${operation}] }]) {
      id: ID
      title: String
      noteA: String @auth(rules: [{ allow: owner }])
    }`;
  return testTransform({
    schema,
    authConfig,
    transformers: [new ModelTransformer(), ...(searchable ? [new SearchableModelTransformer()] : []), new AuthTransformer()],
    resolverConfig: { project: { ConflictDetection: 'VERSION', ConflictHandler: ConflictHandlerType.AUTOMERGE } },
  });
};

describe('read role set built from all read operations', () => {
  describe.each(Object.keys(modelRules))('model rule with %s provider', (provider) => {
    it.each(['read', 'list', 'search', 'listen', 'sync'])(
      'generates the field resolver when the model rule grants only %s',
      (operation) => {
        const out = transformDynamoModel(modelRules[provider], operation);
        expect(out.resolvers['Item.noteA.req.vtl']).toBeDefined();
        expect(out.resolvers['Item.noteA.res.vtl']).toBeDefined();
      },
    );
  });

  it('includes roles that only have list access when building the read role set', () => {
    const out = transformDynamoModel(modelRules.userPools, 'list');
    expect(out.resolvers['Query.listItems.auth.1.req.vtl']).toBeDefined();
    expect(out.resolvers['Item.noteA.req.vtl']).toContain('Field Authorization Steps');
  });

  it('includes roles that only have search access when building the read role set', () => {
    const out = transformDynamoModel(modelRules.userPools, 'search');
    expect(out.resolvers['Query.searchItems.auth.1.req.vtl']).toBeDefined();
    expect(out.resolvers['Item.noteA.req.vtl']).toContain('Field Authorization Steps');
  });

  it('includes roles that only have listen access when building the read role set', () => {
    const out = transformDynamoModel(modelRules.userPools, 'listen');
    expect(out.resolvers['Item.noteA.req.vtl']).toContain('Field Authorization Steps');
  });

  it('includes roles that only have sync access when building the read role set', () => {
    const out = transformDynamoModel(modelRules.userPools, 'sync');
    expect(out.resolvers['Query.syncItems.auth.1.req.vtl']).toBeDefined();
    expect(out.resolvers['Item.noteA.req.vtl']).toContain('Field Authorization Steps');
  });

  it('requires field-level rules on required fields when the model rule grants only list', () => {
    const schema = `
      type Item @model @auth(rules: [{ allow: private, operations: [list] }]) {
        id: ID
        title: String!
        noteA: String @auth(rules: [{ allow: owner }])
      }`;
    expect(() =>
      testTransform({
        schema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      }),
    ).toThrow(/required fields \["title"\]/);
  });

  describe('SQL-backed model', () => {
    const transformSqlModel = (operation: string): ReturnType<typeof testTransform> => {
      const schema = `
        type Item @model @auth(rules: [{ allow: private, operations: [${operation}] }]) {
          id: ID! @primaryKey @auth(rules: [{ allow: owner }])
          title: String
          noteA: String @auth(rules: [{ allow: owner }])
        }`;
      return testTransform({
        schema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
        dataSourceStrategies: constructDataSourceStrategies(schema, mockSqlDataSourceStrategy()),
        synthParameters: { identityPoolId: 'TEST_IDENTITY_POOL_ID' },
      });
    };

    it.each(['list', 'listen'])('includes roles that only have %s access when validating required fields', (operation) => {
      expect(() => transformSqlModel(operation)).toThrow(/required fields \["id"\]/);
    });
  });
});
