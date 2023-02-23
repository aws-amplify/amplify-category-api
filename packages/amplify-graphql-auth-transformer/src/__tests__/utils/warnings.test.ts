import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform } from '@aws-amplify/graphql-transformer-core';
import { IPrinter } from '@aws-amplify/graphql-transformer-interfaces';
import { AuthTransformer } from '../../graphql-auth-transformer';
import { showDefaultIdentityClaimWarning } from '../../utils/warnings';

const printer: IPrinter = {
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  blankLine: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
};

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
          printer,
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
            printer,
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
            printer,
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
            printer,
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
            printer,
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
          printer,
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
      printer,
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

describe('showOwnerFieldCaseWarning', () => {
  const OWNER_FIELD_CASE_MESSAGE = expect.stringContaining('are getting added to your schema but could be referencing the same owner field. ');
  const transformTestSchema = (schema: string): void => {
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
      printer,
    });
    transformer.transform(schema);
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
    transformTestSchema(validSchema);
    expect(printer.warn).not.toBeCalledWith(OWNER_FIELD_CASE_MESSAGE);
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
    transformTestSchema(validSchema);
    expect(printer.warn).not.toBeCalledWith(OWNER_FIELD_CASE_MESSAGE);
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
    transformTestSchema(oneCaseMismatchSchema);
    expect(printer.warn).toBeCalledWith('WARNING: Schema field "storeId" and ownerField "storeID" in type Invoice are getting added to your schema but could be referencing the same owner field. If this is not intentional, you may want to change one of the fields to the correct name.\n');
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
    transformTestSchema(twoCaseMismatchSchema);
    expect(printer.warn).toBeCalledWith('WARNING: Schema field "storeId" and ownerField "storeID" in type Invoice are getting added to your schema but could be referencing the same owner field. If this is not intentional, you may want to change one of the fields to the correct name.\n');
    expect(printer.warn).toBeCalledWith('WARNING: Schema field "customerId" and ownerField "customerID" in type Invoice are getting added to your schema but could be referencing the same owner field. If this is not intentional, you may want to change one of the fields to the correct name.\n');
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
    transformTestSchema(twoCaseMismatchSchema);
    expect(printer.warn).toBeCalledWith('WARNING: Schema field "Owner" and ownerField "owner" in type Invoice are getting added to your schema but could be referencing the same owner field. If this is not intentional, you may want to change one of the fields to the correct name.\n');
  });
});
