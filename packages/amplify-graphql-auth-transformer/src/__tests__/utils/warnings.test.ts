import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform } from '@aws-amplify/graphql-transformer-core';
import { printer } from 'amplify-prompts';
import { AuthTransformer } from '../../graphql-auth-transformer';
import { showDefaultIdentityClaimWarning } from '../../utils/warnings';

jest.mock('amplify-prompts', () => ({
  printer: {
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('showDefaultIdentityClaimWarning', () => {
  describe('owner based @auth', () => {
    describe('feature flag enabled w/o custom identity claim', () => {
      test('does not show message', () => {
        const context: any = {
          featureFlags: {
            getBoolean: () => true,
            getNumber: jest.fn(),
            getObject: jest.fn(),
          },
        };

        showDefaultIdentityClaimWarning(context, [{ allow: 'owner' }]);

        expect(printer.warn).not.toBeCalled();
      });
    });

    describe('feature flag enabled w/ custom identity claim', () => {
      describe('with default cognito identity claim', () => {
        test('does not show message', () => {
          const context: any = {
            featureFlags: {
              getBoolean: () => true,
              getNumber: jest.fn(),
              getObject: jest.fn(),
            },
          };
          showDefaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'cognito:username' }]);

          expect(printer.warn).not.toBeCalled();
        });
      });

      describe('with default identity claim', () => {
        test('does not show message', () => {
          const context: any = {
            featureFlags: {
              getBoolean: () => true,
              getNumber: jest.fn(),
              getObject: jest.fn(),
            },
          };
          showDefaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'username' }]);

          expect(printer.warn).not.toBeCalled();
        });
      });
    });

    describe('feature flag disabled w/ custom identity claim', () => {
      describe('with default cognito identity claim', () => {
        test('does not show message', () => {
          const context: any = {
            featureFlags: {
              getBoolean: () => false,
              getNumber: jest.fn(),
              getObject: jest.fn(),
            },
          };
          showDefaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'cognito:username' }]);

          expect(printer.warn).not.toBeCalled();
        });
      });

      describe('with default identity claim', () => {
        test('does not show message', () => {
          const context: any = {
            featureFlags: {
              getBoolean: () => false,
              getNumber: jest.fn(),
              getObject: jest.fn(),
            },
          };
          showDefaultIdentityClaimWarning(context, [{ allow: 'owner', identityClaim: 'username' }]);

          expect(printer.warn).not.toBeCalled();
        });
      });
    });

    describe('feature flag disabled w/o custom identity claim', () => {
      test('does show message', () => {
        const context: any = {
          featureFlags: {
            getBoolean: () => false,
            getNumber: jest.fn(),
            getObject: jest.fn(),
          },
        };
        showDefaultIdentityClaimWarning(context, [{ allow: 'owner' }]);

        expect(printer.warn).toBeCalledTimes(1);
        expect(printer.warn).toBeCalledWith(
          ' WARNING: Amplify CLI will change the default identity claim from \'username\' '
            + 'to use \'sub::username\'. To continue using only usernames, set \'identityClaim: "username"\' on your '
            + '\'owner\' rules on your schema. The default will be officially switched with v9.0.0. To read '
            + 'more: https://docs.amplify.aws/cli/migration/identity-claim-changes/',
        );
      });
    });
  });
});

describe('showOwnerCanReassignWarning', () => {
  const OWNER_MAY_REASSIGN_MESSAGE = expect.stringContaining('owners may reassign ownership');
  const OWNER_ENABLED_PROVIDERS = ['userPools', 'oidc'];
  const transformTestSchema = (schema: string): void => {
    const transformer = new GraphQLTransform({
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

    transformer.transform(schema);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  OWNER_ENABLED_PROVIDERS.forEach((provider: string) => {
    describe(`${provider} provider`, () => {
      test('warns on owner auth rule without field-level auth', () => {
        transformTestSchema(`
          type Blog @model @auth(rules: [{ allow: owner, provider: ${provider} }]) {
            id: ID!
            owner: String
            description: String
          }
        `);

        expect(printer.warn).toHaveBeenCalledWith(OWNER_MAY_REASSIGN_MESSAGE);
        expect(printer.warn).toHaveBeenCalledWith(
          'WARNING: owners may reassign ownership for the following model(s) and role(s): Blog: [owner]. '
          + 'If this is not intentional, you may want to apply field-level authorization rules to these fields. '
          + 'To read more: https://docs.amplify.aws/cli/graphql/authorization-rules/#per-user--owner-based-data-access.',
        );
      });

      test('does not warn on owner auth rule with field-level auth', () => {
        transformTestSchema(`
          type Blog @model @auth(rules: [{ allow: owner, provider: ${provider} }]) {
            id: ID!
            owner: String @auth(rules: [{ allow: owner, provider: ${provider}, operations: [read, delete] }])
            description: String
          }
        `);

        expect(printer.warn).not.toHaveBeenCalledWith(OWNER_MAY_REASSIGN_MESSAGE);
      });

      test('warns on multiple schemas with multiple reassignable owners each', () => {
        transformTestSchema(`
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

        expect(printer.warn).toHaveBeenCalledWith(OWNER_MAY_REASSIGN_MESSAGE);
        expect(printer.warn).toHaveBeenCalledWith(
          'WARNING: owners may reassign ownership for the following model(s) and role(s): Todo: [writer, editors], Blog: [owner]. '
          + 'If this is not intentional, you may want to apply field-level authorization rules to these fields. '
          + 'To read more: https://docs.amplify.aws/cli/graphql/authorization-rules/#per-user--owner-based-data-access.',
        );
      });

      test('does not warn on custom owner fields with field-level overrides', () => {
        transformTestSchema(`
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

        expect(printer.warn).not.toHaveBeenCalledWith(OWNER_MAY_REASSIGN_MESSAGE);
      });

      test('does not warn on single custom owner fields with field-level override', () => {
        transformTestSchema(`
          type Todo @model @auth(rules: [
            { allow: owner, provider: ${provider} ownerField: "writer" }
          ]) {
            id: ID!
            description: String
            writer: String @auth(rules: [{ allow: owner, provider: ${provider}, ownerField: "writer", operations: [read] }])
          }
        `);

        expect(printer.warn).not.toHaveBeenCalledWith(OWNER_MAY_REASSIGN_MESSAGE);
      });

      test('malformed field-level auth will continue to warn', () => {
        transformTestSchema(`
          type Todo @model(subscriptions: null) @auth(rules: [
            { allow: owner, provider: ${provider} ownerField: "writer" }
          ]) {
            id: ID!
            description: String
            writer: String @auth(rules: [{ allow: owner, provider: ${provider}, operations: [read] }])
          }
        `);

        expect(printer.warn).toHaveBeenCalledWith(OWNER_MAY_REASSIGN_MESSAGE);
      });

      test('should warn on implicit owner field', () => {
        transformTestSchema(`
          type Blog @model @auth(rules: [{ allow: owner, provider: ${provider} }]) {
            id: ID!
            description: String
          }
        `);

        expect(printer.warn).toHaveBeenCalledWith(OWNER_MAY_REASSIGN_MESSAGE);
        expect(printer.warn).toHaveBeenCalledWith(
          'WARNING: owners may reassign ownership for the following model(s) and role(s): Blog: [owner]. '
          + 'If this is not intentional, you may want to apply field-level authorization rules to these fields. '
          + 'To read more: https://docs.amplify.aws/cli/graphql/authorization-rules/#per-user--owner-based-data-access.',
        );
      });
    });
  });
});
