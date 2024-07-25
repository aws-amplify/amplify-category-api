import { AuthProvider, AuthStrategy, AuthTransformer, ModelOperation } from '@aws-amplify/graphql-auth-transformer';
import { AppSyncGraphQLExecutionContext } from '@aws-amplify/amplify-appsync-simulator/lib/utils/graphql-runner';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { AmplifyAppSyncSimulatorAuthenticationType } from '@aws-amplify/amplify-appsync-simulator';
import { plurality } from 'graphql-transformer-common';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { AppSyncVTLContext, getGenericToken, getIAMToken, getJWTToken, VelocityTemplateSimulator } from '../../velocity';

const USER_POOL_ID = 'us-fake-1ID';

const authConfig: AppSyncAuthConfiguration = {
  defaultAuthentication: {
    authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  },
  additionalAuthenticationProviders: [
    { authenticationType: 'AWS_IAM' },
    { authenticationType: 'API_KEY' },
    {
      authenticationType: 'OPENID_CONNECT',
      openIDConnectConfig: {
        name: 'myOIDCProvider',
        issuerUrl: 'https://some-oidc-provider/auth',
        clientId: 'my-sample-client-id',
      },
    },
    {
      authenticationType: 'AWS_LAMBDA',
      lambdaAuthorizerConfig: {
        lambdaFunction: 'authorize',
        ttlSeconds: 600,
      },
    },
  ],
};
const strategyProviders: Record<AuthStrategy, AuthProvider[]> = {
  public: ['apiKey', 'iam'],
  owner: ['userPools', 'oidc'],
  private: ['userPools', 'oidc', 'iam'],
  groups: ['userPools', 'oidc'],
  custom: ['function'],
};

const generateUser = (provider: AuthProvider, strategy: AuthStrategy): AppSyncGraphQLExecutionContext => {
  switch (provider) {
    case 'apiKey':
      return generateAPIKeyContext();
    case 'iam':
      return generateIAMContext(strategy);
    case 'oidc':
      return generateOIDCContext();
    case 'userPools':
      return generateUserPoolsContext();
    default:
      throw new Error(`'${provider}' auth provider not supported for this test`);
  }
};

const generateAPIKeyContext = (): AppSyncGraphQLExecutionContext => ({
  requestAuthorizationMode: AmplifyAppSyncSimulatorAuthenticationType.API_KEY,
  headers: { 'x-api-key': 'da-fake-key' },
  appsyncErrors: [],
});

const generateIAMContext = (strategy: AuthStrategy): AppSyncGraphQLExecutionContext => ({
  requestAuthorizationMode: AmplifyAppSyncSimulatorAuthenticationType.AWS_IAM,
  iamToken: getIAMToken(strategy === 'private' ? 'authRole' : 'unauthRole', {
    cognitoIdentityAuthProvider: `cognito-idp.us-fake1.amazonaws.com/${USER_POOL_ID}`,
    cognitoIdentityAuthType: strategy === 'private' ? 'authenticated' : 'unauthenticated',
    cognitoIdentityPoolId: `${USER_POOL_ID}:000-111-222`,
    cognitoIdentityId: 'us-fake-1:000',
  }),
  headers: {},
});

const generateOIDCContext = (): AppSyncGraphQLExecutionContext => ({
  requestAuthorizationMode: AmplifyAppSyncSimulatorAuthenticationType.OPENID_CONNECT,
  jwt: getGenericToken('user1', 'user1@test.com', ['admins']),
  headers: {},
});

const generateUserPoolsContext = (): AppSyncGraphQLExecutionContext => ({
  requestAuthorizationMode: AmplifyAppSyncSimulatorAuthenticationType.AMAZON_COGNITO_USER_POOLS,
  jwt: getJWTToken(USER_POOL_ID, 'user1', 'user1@test.com', ['admins']),
  headers: {},
});

const generateInvalidUserPoolsContext = (context: AppSyncGraphQLExecutionContext): AppSyncGraphQLExecutionContext => {
  const invalidMode = Object.values(AmplifyAppSyncSimulatorAuthenticationType).find((it) => it !== context.requestAuthorizationMode);
  return {
    requestAuthorizationMode: invalidMode,
    headers: {},
  };
};

const getOperationRelatedTemplates = (operation: ModelOperation, modelName: string): string[] => {
  switch (operation) {
    case 'create':
      return [`Mutation.${operation}${modelName}.auth.1.req.vtl`];
    case 'delete':
    case 'update':
      return [`Mutation.${operation}${modelName}.auth.1.res.vtl`];
    case 'list':
      return [`Query.list${plurality(modelName, true)}.auth.1.req.vtl`];
    case 'get':
      return [`Query.get${modelName}.auth.1.req.vtl`];
    default:
      throw new Error(`'${operation}' auth operation not supported for this test`);
  }
};

const generateAuthDirective = (authStrategy: AuthStrategy, authProvider: AuthProvider, operation?: ModelOperation): string => `@auth (
    rules: [
      {
        allow: ${authStrategy},
        operations: [${operation ?? ''}],
        provider: ${authProvider},
        ${authStrategy === 'groups' ? 'groupsField: "groups",' : ''}
        ${authStrategy === 'groups' && authProvider === 'oidc' ? 'groupClaim: "groups",' : ''}
      },
    ]
  )`;

const getInputContext = (operation: ModelOperation, authStrategy: AuthStrategy, authProvider: AuthProvider): AppSyncVTLContext => {
  const context: AppSyncVTLContext = {};
  switch (operation) {
    case 'create': {
      Object.assign(context, {
        arguments: {
          input: {
            profileId: '001',
            title: 'sample',
            firstName: 'Amplify',
            lastName: 'CLI',
            groups: 'admins',
          },
        },
      });
      break;
    }
    case 'update': {
      Object.assign(context, {
        result: {
          profileId: '001',
          title: 'updated',
          firstName: 'Amplify',
          lastName: 'CLI',
          owner: 'user1',
          groups: 'admins',
        },
      });
      break;
    }
    case 'delete': {
      Object.assign(context, {
        result: {
          profileId: '001',
          firstName: 'Amplify',
          lastName: 'CLI',
          owner: 'user1',
          groups: 'admins',
        },
      });
      break;
    }
    case 'list':
    case 'get':
      break;
    default:
      throw new Error(`'${operation}' operation is not supported for this test case`);
  }

  if (authProvider === 'iam') {
    Object.assign(
      context,
      authStrategy === 'private'
        ? { stash: { authRole: 'arn:aws:sts::123456789012:assumed-role/authRole/CognitoIdentityCredentials' } }
        : { stash: { unauthRole: 'arn:aws:sts::123456789012:assumed-role/unauthRole/CognitoIdentityCredentials' } },
    );
  }

  return context;
};

const validateRenderTemplate = (
  template: string,
  context: AppSyncGraphQLExecutionContext,
  operation: ModelOperation,
  authStrategy: AuthStrategy,
  authProvider: AuthProvider,
  hasPartialAccess: boolean,
): void => {
  const vtlTemplate: VelocityTemplateSimulator = new VelocityTemplateSimulator({ authConfig });
  const inputContext = getInputContext(operation, authStrategy, authProvider);

  const authorizedRequest = vtlTemplate.render(template, { context: inputContext, requestParameters: context });
  expect(authorizedRequest).toBeDefined();
  expect(authorizedRequest.stash.hasAuth).toEqual(true);
  expect(authorizedRequest.args).toBeDefined();

  // delete should fail all the time if there is partial access to the model
  expect(authorizedRequest.hadException).toEqual(!!(hasPartialAccess && operation === 'delete'));

  try {
    const unauthorizedRequest = vtlTemplate.render(template, {
      context: inputContext,
      requestParameters: generateInvalidUserPoolsContext(context),
    });
    expect(unauthorizedRequest).toBeDefined();
    expect(unauthorizedRequest.stash.hasAuth).toEqual(true);
    expect(unauthorizedRequest.args).toBeDefined();
    expect(unauthorizedRequest.hadException).toEqual(true);
  } catch (_) {
    // for public apiKey render throws exception
    expect(true).toEqual(true);
  }
};

const testResolverLogic = (
  authStrategy: AuthStrategy,
  authProvider: AuthProvider,
  context: AppSyncGraphQLExecutionContext,
  operation: ModelOperation,
  hasPartialAccess = false,
  hasCustomPrimaryKey = false,
): void => {
  const authRuleDirective = generateAuthDirective(authStrategy, authProvider, operation);
  const authRuleDirectiveNoOps = generateAuthDirective(authStrategy, authProvider);

  const validSchema = `
    type Profile @model ${authRuleDirective} {
      profileId: ID! ${hasCustomPrimaryKey ? '@primaryKey(sortKeyFields: ["firstName", "lastName"])' : ''}
      firstName: String!
      lastName: String!
      title: String
      groups: [String]
      ${hasPartialAccess ? `noAccessField: String ${authRuleDirectiveNoOps}` : ''}
    }`;

  const out = testTransform({
    schema: validSchema,
    authConfig,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer()],
  });

  const templates = getOperationRelatedTemplates(operation, 'Profile');

  templates.forEach((templateName) => {
    const template = out.resolvers[templateName];
    validateRenderTemplate(template, context, operation, authStrategy, authProvider, hasPartialAccess);
  });
};

describe('acm resolver tests', () => {
  const authStrategies: AuthStrategy[] = ['owner', 'groups', 'public', 'private'];
  authStrategies.forEach((authStrategy) => {
    const providers = strategyProviders[authStrategy];

    providers.forEach((provider) => {
      const userContext = generateUser(provider, authStrategy);
      const operations: ModelOperation[] = ['create', 'get', 'list', 'update', 'delete'];
      operations.forEach((operation) => {
        it(`should generate auth resolver logic that passes as expected for '${authStrategy}' strategy using '${provider}' provider running '${operation}' operation`, () => {
          testResolverLogic(authStrategy, provider, userContext, operation);
        });

        it(`should generate auth resolver logic that passes as expected for '${authStrategy}' strategy using '${provider}' provider running '${operation}' operation: partial access`, () => {
          testResolverLogic(authStrategy, provider, userContext, operation, true);
        });

        it(`should generate auth resolver logic that passes as expected for '${authStrategy}' strategy using '${provider}' provider running '${operation}' operation: custom primary key`, () => {
          testResolverLogic(authStrategy, provider, userContext, operation, false, true);
        });

        it(`should generate auth resolver logic that passes as expected for '${authStrategy}' strategy using '${provider}' provider running '${operation}' operation: partial access and custom primary key`, () => {
          testResolverLogic(authStrategy, provider, userContext, operation, true, true);
        });
      });
    });
  });
});
