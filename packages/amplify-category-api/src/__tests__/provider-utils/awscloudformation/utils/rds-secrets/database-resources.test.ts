import { $TSContext, stateManager } from '@aws-amplify/amplify-cli-core';
import { getParameterStoreSecretPath } from '@aws-amplify/graphql-transformer-core';
import { getExistingConnectionSecrets } from '../../../../../provider-utils/awscloudformation/utils/rds-resources/database-resources';

const mockDatabase = 'mockdatabase';
const mockAPIName = 'mockapi';

jest.mock('../../../../../provider-utils/awscloudformation/utils/rds-resources/ssmClient', () => ({
  SSMClient: {
    getInstance: jest.fn().mockResolvedValue({
      getSecrets: jest.fn(),
      setSecret: jest.fn(),
    }),
  },
}));

jest.mock('@aws-amplify/amplify-cli-core', () => {
  const original = jest.requireActual('@aws-amplify/amplify-cli-core');
  return {
    ...original,
    stateManager: {
      getAppID: jest.fn().mockReturnValue('fake-app-id'),
      getCurrentEnvName: jest.fn().mockReturnValue('test'),
    },
  };
});

describe('Test database secrets management', () => {
  const mockContext = {} as any as $TSContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('Returns correct path for secrets in parameter store for a database', () => {
    const appId = stateManager.getAppID();
    const envName = stateManager.getCurrentEnvName();
    const usernamePath = getParameterStoreSecretPath('username', mockDatabase, mockAPIName, envName, appId);
    expect(usernamePath).toEqual('/amplify/fake-app-id/test/AMPLIFY_apimockapimockdatabase_username');

    const passwordPath = getParameterStoreSecretPath('password', mockDatabase, mockAPIName, envName, appId);
    expect(passwordPath).toEqual('/amplify/fake-app-id/test/AMPLIFY_apimockapimockdatabase_password');
  });

  it('Returns undefined if secrets do not exist in parameter store for a database', async () => {
    const fetchedSecrets = await getExistingConnectionSecrets(mockContext, mockDatabase, mockAPIName);
    expect(fetchedSecrets).not.toBeDefined();
  });
});
