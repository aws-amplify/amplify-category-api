import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform } from '@aws-amplify/graphql-transformer-core';
import { AuthTransformer } from '../../graphql-auth-transformer';
import { defaultIdentityClaimWarning } from '../../utils/warnings';

describe('defaultIdentityClaimWarning', () => {
  describe('owner based @auth', () => {
    describe('feature flag enabled w/o custom identity claim', () => {
      test('does not return message', () => {
        const context: any = {
          featureFlags: {
            getBoolean: () => true,
            getNumber: jest.fn(),
            getObject: jest.fn(),
          },
        };

        expect(defaultIdentityClaimWarning(context, [{ allow: 'owner' }])).toBeUndefined();
      });
    });

    describe('feature flag enabled w/ custom identity claim', () => {
      describe('with default cognito identity claim', () => {
        test('does not return message', () => {
          const context: any = {
            featureFlags: {
              getBoolean: () => true,
              getNumber: jest.fn(),
              getObject: jest.fn(),
            },
          };
          expect(defaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'cognito:username' }])).toBeUndefined();
        });
      });

      describe('with default identity claim', () => {
        test('does not return message', () => {
          const context: any = {
            featureFlags: {
              getBoolean: () => true,
              getNumber: jest.fn(),
              getObject: jest.fn(),
            },
          };
          expect(defaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'username' }])).toBeUndefined();
        });
      });
    });

    describe('feature flag disabled w/ custom identity claim', () => {
      describe('with default cognito identity claim', () => {
        test('does not return message', () => {
          const context: any = {
            featureFlags: {
              getBoolean: () => false,
              getNumber: jest.fn(),
              getObject: jest.fn(),
            },
          };
          expect(defaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'cognito:username' }])).toBeUndefined();
        });
      });

      describe('with default identity claim', () => {
        test('does not return message', () => {
          const context: any = {
            featureFlags: {
              getBoolean: () => false,
              getNumber: jest.fn(),
              getObject: jest.fn(),
            },
          };
          expect(defaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'username' }])).toBeUndefined();
        });
      });
    });

    describe('feature flag disabled w/o custom identity claim', () => {
      test('does return message', () => {
        const context: any = {
          featureFlags: {
            getBoolean: () => false,
            getNumber: jest.fn(),
            getObject: jest.fn(),
          },
        };
        expect(defaultIdentityClaimWarning(context, [{ allow: 'owner' }])).toEqual(
          " WARNING: Amplify CLI will change the default identity claim from 'username' " +
            "to use 'sub::username'. To continue using only usernames, set 'identityClaim: \"username\"' on your " +
            "'owner' rules on your schema. The default will be officially switched with v9.0.0. To read " +
            'more: https://docs.amplify.aws/cli/migration/identity-claim-changes/',
        );
      });
    });
  });
});

describe('ownerCanReassignWarning', () => {
  const OWNER_MAY_REASSIGN_MESSAGE = 'owners may reassign ownership';
  const OWNER_ENABLED_PROVIDERS = ['userPools', 'oidc'];
  const transformTestSchema = (schema: string): GraphQLTransform => {
    const transform = new GraphQLTransform({
      authConfig: {
        defaultAuthentication: { authenticationType: 'API_KEY' },
        additionalAuthenticationProviders: [
          { authenticationType: 'AMAZON_COGNITO_USER_POOLS' },
          {
            authenticationType: 'OPENID_CONNECT',
            openIDConnectConfig: {
              name: 'myOIDCProvider',
              issuerUrl: 'https://some-oidc-provider/auth',
              clientId: 'my-sample-client-id',
            },
          },
        ],
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
      featureFlags: {
        getBoolean: jest.fn(),
        getNumber: jest.fn(),
        getObject: jest.fn(),
      },
    });

    transform.transform(schema);
    return transform;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  OWNER_ENABLED_PROVIDERS.forEach((provider: string) => {
    describe(`${provider} provider`, () => {
      test('warns on owner auth rule without field-level auth', () => {
        const transform = transformTestSchema(`
          type Blog @model @auth(rules: [{ allow: owner, provider: ${provider} }]) {
            id: ID!
            owner: String
            description: String
          }
        `);

        expect(transform.getLogs()).toMatchSnapshot();
      });

      test('does not warn on owner auth rule with field-level auth', () => {
        const transform = transformTestSchema(`
          type Blog @model @auth(rules: [{ allow: owner, provider: ${provider} }]) {
            id: ID!
            owner: String @auth(rules: [{ allow: owner, provider: ${provider}, operations: [read, delete] }])
            description: String
          }
        `);

        expect(transform.getLogs()).toMatchSnapshot();
      });

      test('warns on multiple schemas with multiple reassignable owners each', () => {
        const transform = transformTestSchema(`
          type Todo @model @auth(rules: [
            { allow: owner, provider: ${provider} }
            { allow: owner, provider: ${provider}, ownerField: "writer" }
            { allow: owner, provider: ${provider}, ownerField: "editors" }
          ]) {
            id: ID!
            description: String
            writer: String
            editors: [String]
            owner: String @auth(rules: [{ allow: owner, provider: ${provider}, operations: [read] }])
          }
          
          type Blog @model @auth(rules: [{ allow: owner, provider: ${provider} }]) {
            id: ID!
            owner: String
            description: String
          }
        `);

        expect(transform.getLogs()).toMatchSnapshot();
      });

      test('does not warn on custom owner fields with field-level overrides', () => {
        const transform = transformTestSchema(`
          type Todo @model @auth(rules: [
            { allow: owner, provider: ${provider} }
            { allow: owner, provider: ${provider} ownerField: "writer" }
            { allow: owner, provider: ${provider} ownerField: "editors" }
          ]) {
            id: ID!
            description: String
            writer: String @auth(rules: [{ allow: owner, provider: ${provider}, operations: [read] }])
            editors: [String] @auth(rules: [{ allow: owner, provider: ${provider}, operations: [read] }])
            owner: String @auth(rules: [{ allow: owner, provider: ${provider}, operations: [read] }])
          }
        `);

        expect(transform.getLogs()).toMatchSnapshot();
      });

      test('does not warn on single custom owner fields with field-level override', () => {
        const transform = transformTestSchema(`
          type Todo @model @auth(rules: [
            { allow: owner, provider: ${provider} ownerField: "writer" }
          ]) {
            id: ID!
            description: String
            writer: String @auth(rules: [{ allow: owner, provider: ${provider}, ownerField: "writer", operations: [read] }])
          }
        `);

        expect(transform.getLogs()).toMatchSnapshot();
      });

      test('malformed field-level auth will continue to warn', () => {
        const transform = transformTestSchema(`
          type Todo @model(subscriptions: null) @auth(rules: [
            { allow: owner, provider: ${provider}, ownerField: "writer" }
            { allow: owner, provider: ${provider}, operations: [read] }
          ]) {
            id: ID!
            description: String
            writer: String @auth(rules: [{ allow: owner, provider: ${provider}, operations: [read] }])
          }
        `);

        expect(transform.getLogs()).toMatchSnapshot();
      });

      test('should warn on implicit owner field', () => {
        const transform = transformTestSchema(`
          type Blog @model @auth(rules: [{ allow: owner, provider: ${provider} }]) {
            id: ID!
            description: String
          }
        `);

        expect(transform.getLogs()).toMatchSnapshot();
      });
    });
  });
});

describe('ownerFieldCaseWarning', () => {
  const OWNER_FIELD_CASE_MESSAGE = expect.stringContaining(
    'are getting added to your schema but could be referencing the same owner field. ',
  );
  const transformTestSchema = (schema: string): GraphQLTransform => {
    const transformer = new GraphQLTransform({
      authConfig: {
        defaultAuthentication: { authenticationType: 'AMAZON_COGNITO_USER_POOLS' },
        additionalAuthenticationProviders: [],
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
      featureFlags: {
        getBoolean: jest.fn(),
        getNumber: jest.fn(),
        getObject: jest.fn(),
      },
    });
    transformer.transform(schema);
    return transformer;
  };
  test('does not show message with case matching fields', () => {
    const validSchema = `
type Invoice
  @model
  @auth(
    rules: [
      { allow: owner, ownerField: "storeId", operations: [create, read] }
      { allow: owner, ownerField: "customerId", operations: [create, read] }
      { allow: owner }
    ]
  ) {
  id: ID!
  items: [String]
  storeId: ID!
  customerId: ID!
}
`;
    const transform = transformTestSchema(validSchema);
    expect(transform.getLogs()).toMatchSnapshot();
  });

  test('does not show message with no auth rules', () => {
    const validSchema = `
type Invoice
  @model {
  id: ID!
  items: [String]
  storeId: ID!
  customerId: ID!
}
`;
    const transform = transformTestSchema(validSchema);
    expect(transform.getLogs()).toMatchSnapshot();
  });
  test('shows message once with one case mismatch in fields', () => {
    const oneCaseMismatchSchema = `
type Invoice
  @model
  @auth(
    rules: [
      { allow: owner, ownerField: "storeID", operations: [create, read] }
      { allow: owner, ownerField: "customerId", operations: [create, read] }
      { allow: owner }
    ]
  ) {
  id: ID!
  items: [String]
  storeId: ID!
  customerId: ID!
}
`;
    const transform = transformTestSchema(oneCaseMismatchSchema);
    expect(transform.getLogs()).toMatchSnapshot();
  });

  test('shows message twice with two case mismatch in fields', () => {
    const twoCaseMismatchSchema = `
type Invoice
  @model
  @auth(
    rules: [
      { allow: owner, ownerField: "storeID", operations: [create, read] }
      { allow: owner, ownerField: "customerID", operations: [create, read] }
      { allow: owner }
    ]
  ) {
  id: ID!
  items: [String]
  storeId: ID!
  customerId: ID!
}
`;
    const transform = transformTestSchema(twoCaseMismatchSchema);
    expect(transform.getLogs()).toMatchSnapshot();
  });
  test('shows message with implicit owner field', () => {
    const twoCaseMismatchSchema = `
type Invoice
  @model
  @auth(
    rules: [
      { allow: owner, ownerField: "storeId", operations: [create, read] }
      { allow: owner, ownerField: "customerId", operations: [create, read] }
      { allow: owner }
    ]
  ) {
  id: ID!
  items: [String]
  storeId: ID!
  customerId: ID!
  Owner: String
}
`;
    const transform = transformTestSchema(twoCaseMismatchSchema);
    expect(transform.getLogs()).toMatchSnapshot();
  });
});
