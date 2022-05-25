import { AuthProvider, AuthStrategy, ModelOperation } from '@aws-amplify/graphql-auth-transformer';
import moment from 'moment';
import {
  cleanupAuthExhaustiveTest, deploySchema, generateTestModel, testAuthResolver,
} from '../authExhaustiveTestUtils';

const strategyProviders: Record<AuthStrategy, AuthProvider[]> = {
  public: ['apiKey'],
  owner: ['userPools'],
  private: ['userPools'],
  groups: ['userPools'],
  custom: ['function'],
};

const tests: { modelName: string, strategy: AuthStrategy, provider: AuthProvider, operation: ModelOperation }[] = [];

const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
const STACK_NAME = `auth-exhaustive-tests-2-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `auth-exhaustive-tests-bucket-2-${BUILD_TIMESTAMP}`;
const AUTH_ROLE_NAME = `${STACK_NAME}-authRole`;
const UNAUTH_ROLE_NAME = `${STACK_NAME}-unauthRole`;
const LOCAL_FS_BUILD_DIR = `/tmp/auth_v2_exhaustive_tests_2_${BUILD_TIMESTAMP}/`;

let USER_POOL_ID: string;
let IDENTITY_POOL_ID: string;
let ID_TOKEN: string;
let ACCESS_TOKEN: string;
let API_KEY: string;
let GRAPHQL_ENDPOINT: string;

describe('e2e auth resolvers tests', () => {
  const schemaModels: string[] = [];
  const authStrategies: AuthStrategy[] = ['owner', 'groups', 'public', 'private'];
  authStrategies.forEach(strategy => {
    const providers = strategyProviders[strategy];

    providers.forEach(provider => {
      const operations: ModelOperation[] = ['create', 'read', 'update', 'delete'];
      operations.forEach(operation => {
        const { modelName, schema } = generateTestModel(strategy, provider, operation, true, true);
        tests.push({
          modelName, strategy, provider, operation,
        });
        schemaModels.push(schema);
      });
    });
  });

  beforeAll(async () => {
    const {
      idToken,
      accessToken,
      apiKey,
      graphqlEndpoint,
      userPoolId,
      identityPoolId,
    } = await deploySchema(schemaModels.join('\n'), STACK_NAME, BUCKET_NAME, AUTH_ROLE_NAME, UNAUTH_ROLE_NAME, LOCAL_FS_BUILD_DIR, BUILD_TIMESTAMP);

    USER_POOL_ID = userPoolId;
    IDENTITY_POOL_ID = identityPoolId;
    ID_TOKEN = idToken;
    ACCESS_TOKEN = accessToken;
    API_KEY = apiKey;
    GRAPHQL_ENDPOINT = graphqlEndpoint;
  });

  afterAll(async () => {
    await cleanupAuthExhaustiveTest(STACK_NAME, BUCKET_NAME, AUTH_ROLE_NAME, UNAUTH_ROLE_NAME, USER_POOL_ID, IDENTITY_POOL_ID);
  });

  it.each(tests)(
    'should generate auth resolver logic that passes as expected for %o',
    async ({
      modelName, strategy, provider, operation,
    }) => {
      expect(true).toBeTruthy();
      await testAuthResolver(GRAPHQL_ENDPOINT, modelName, strategy, provider, operation, ID_TOKEN, ACCESS_TOKEN, API_KEY, true, true);
    },
  );
});
