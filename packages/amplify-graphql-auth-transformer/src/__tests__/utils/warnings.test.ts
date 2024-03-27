import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { TransformerLog, TransformerLogLevel, TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import { AuthTransformer } from '../../graphql-auth-transformer';
import { defaultIdentityClaimWarning } from '../../utils/warnings';

describe('defaultIdentityClaimWarning', () => {
  describe('owner based @auth', () => {
    describe('feature flag enabled w/o custom identity claim', () => {
      test('does not return message', () => {
        const context: any = {
          transformParameters: {
            useSubUsernameForDefaultIdentityClaim: true,
            populateOwnerFieldForStaticGroupAuth: true,
          } as TransformParameters,
        };

        expect(defaultIdentityClaimWarning(context, [{ allow: 'owner' }])).toBeUndefined();
      });
    });

    describe('feature flag enabled w/ custom identity claim', () => {
      describe('with default cognito identity claim', () => {
        test('does not return message', () => {
          const context: any = {
            transformParameters: {
              useSubUsernameForDefaultIdentityClaim: true,
              populateOwnerFieldForStaticGroupAuth: true,
            } as TransformParameters,
          };
          expect(defaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'cognito:username' }])).toBeUndefined();
        });
      });

      describe('with default identity claim', () => {
        test('does not return message', () => {
          const context: any = {
            transformParameters: {
              useSubUsernameForDefaultIdentityClaim: true,
              populateOwnerFieldForStaticGroupAuth: true,
            } as TransformParameters,
          };
          expect(defaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'username' }])).toBeUndefined();
        });
      });
    });

    describe('feature flag disabled w/ custom identity claim', () => {
      describe('with default cognito identity claim', () => {
        test('does not return message', () => {
          const context: any = {
            transformParameters: {
              useSubUsernameForDefaultIdentityClaim: false,
              populateOwnerFieldForStaticGroupAuth: false,
            } as TransformParameters,
          };
          expect(defaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'cognito:username' }])).toBeUndefined();
        });
      });

      describe('with default identity claim', () => {
        test('does not return message', () => {
          const context: any = {
            transformParameters: {
              useSubUsernameForDefaultIdentityClaim: true,
              populateOwnerFieldForStaticGroupAuth: true,
            } as TransformParameters,
          };
          expect(defaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'username' }])).toBeUndefined();
        });
      });
    });

    describe('feature flag disabled w/o custom identity claim', () => {
      test('does return message', () => {
        const context: any = {
          transformParameters: {
            useSubUsernameForDefaultIdentityClaim: false,
            populateOwnerFieldForStaticGroupAuth: false,
          } as TransformParameters,
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
  const OWNER_ENABLED_PROVIDERS = ['userPools', 'oidc'];
  const executeTransformAndReturnLogs = (schema: string): string[] =>
    testTransform({
      schema,
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
      transformParameters: {
        useSubUsernameForDefaultIdentityClaim: false,
      },
    }).logs;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  OWNER_ENABLED_PROVIDERS.forEach((provider: string) => {
    describe(`${provider} provider`, () => {
      test('warns on owner auth rule without field-level auth', () => {
        expect(
          executeTransformAndReturnLogs(`
          type Blog @model @auth(rules: [{ allow: owner, provider: ${provider} }]) {
            id: ID!
            owner: String
            description: String
          }
        `),
        ).toMatchSnapshot();
      });

      test('does not warn on owner auth rule with field-level auth', () => {
        expect(
          executeTransformAndReturnLogs(`
          type Blog @model @auth(rules: [{ allow: owner, provider: ${provider} }]) {
            id: ID!
            owner: String @auth(rules: [{ allow: owner, provider: ${provider}, operations: [read, delete] }])
            description: String
          }
        `),
        ).toMatchSnapshot();
      });

      test('warns on multiple schemas with multiple reassignable owners each', () => {
        expect(
          executeTransformAndReturnLogs(`
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
        `),
        ).toMatchSnapshot();
      });

      test('does not warn on custom owner fields with field-level overrides', () => {
        expect(
          executeTransformAndReturnLogs(`
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
        `),
        ).toMatchSnapshot();
      });

      test('does not warn on single custom owner fields with field-level override', () => {
        expect(
          executeTransformAndReturnLogs(`
          type Todo @model @auth(rules: [
            { allow: owner, provider: ${provider} ownerField: "writer" }
          ]) {
            id: ID!
            description: String
            writer: String @auth(rules: [{ allow: owner, provider: ${provider}, ownerField: "writer", operations: [read] }])
          }
        `),
        ).toMatchSnapshot();
      });

      test('malformed field-level auth will continue to warn', () => {
        expect(
          executeTransformAndReturnLogs(`
          type Todo @model(subscriptions: null) @auth(rules: [
            { allow: owner, provider: ${provider}, ownerField: "writer" }
            { allow: owner, provider: ${provider}, operations: [read] }
          ]) {
            id: ID!
            description: String
            writer: String @auth(rules: [{ allow: owner, provider: ${provider}, operations: [read] }])
          }
        `),
        ).toMatchSnapshot();
      });

      test('should warn on implicit owner field', () => {
        expect(
          executeTransformAndReturnLogs(`
          type Blog @model @auth(rules: [{ allow: owner, provider: ${provider} }]) {
            id: ID!
            description: String
          }
        `),
        ).toMatchSnapshot();
      });
    });
  });
});

describe('ownerFieldCaseWarning', () => {
  const executeTransformAndReturnLogs = (schema: string): string[] =>
    testTransform({
      schema,
      authConfig: {
        defaultAuthentication: { authenticationType: 'AMAZON_COGNITO_USER_POOLS' },
        additionalAuthenticationProviders: [],
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
      transformParameters: {
        useSubUsernameForDefaultIdentityClaim: false,
      },
    }).logs;

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
    expect(executeTransformAndReturnLogs(validSchema)).toMatchSnapshot();
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
    expect(executeTransformAndReturnLogs(validSchema)).toMatchSnapshot();
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
    expect(executeTransformAndReturnLogs(oneCaseMismatchSchema)).toMatchSnapshot();
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
    expect(executeTransformAndReturnLogs(twoCaseMismatchSchema)).toMatchSnapshot();
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
    expect(executeTransformAndReturnLogs(twoCaseMismatchSchema)).toMatchSnapshot();
  });
});

describe('deprecatedIAMProviderWarning', () => {
  const executeTransformAndReturnLogs = (schema: string): Array<TransformerLog> =>
    testTransform({
      schema,
      authConfig: {
        defaultAuthentication: { authenticationType: 'AWS_IAM' },
        additionalAuthenticationProviders: [],
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
      transformParameters: {
        useSubUsernameForDefaultIdentityClaim: false,
      },
    }).logs;

  test('does not show message when identityPool provider is used', () => {
    const schema = `
type Invoice
  @model
  @auth(
    rules: [
      { allow: private, provider: identityPool }
    ]
  ) {
  id: ID!
  items: [String]
  storeId: ID!
  customerId: ID!
}
`;
    const logs = executeTransformAndReturnLogs(schema);
    expect(logs.length).toBe(0);
  });

  test('shows message when iam provider is used', () => {
    const schema = `
type Invoice
  @model
  @auth(
    rules: [
      { allow: private, provider: iam }
    ]
  ) {
  id: ID!
  items: [String]
  storeId: ID!
  customerId: ID!
}
`;
    const logs = executeTransformAndReturnLogs(schema);
    expect(logs.length).toBe(1);
    const log = logs[0];
    expect(log.level).toBe(TransformerLogLevel.WARN);
    expect(log.message).toBe(
      "WARNING: Schema is using an @auth directive with deprecated provider 'iam'. Replace 'iam' provider with 'identityPool' provider.",
    );
  });
});
