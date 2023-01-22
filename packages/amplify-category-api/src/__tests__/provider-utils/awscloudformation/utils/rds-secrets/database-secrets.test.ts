import { $TSAny, $TSContext } from 'amplify-cli-core';
import { getExistingConnectionSecrets, getParameterStoreSecretPath } from '../../../../../provider-utils/awscloudformation/utils/rds-secrets/database-secrets';

const mockDatabase = 'mockdatabase';
const mockAPIName = 'mockapi';

jest.mock('../../../../../provider-utils/awscloudformation/utils/rds-secrets/ssmClient', () => ({
  SSMClient: {
    getInstance: jest.fn().mockResolvedValue({
      getSecrets: jest.fn(),
      setSecret: jest.fn()
    })
  }
}));

jest.mock('amplify-cli-core', () => {
  const original = jest.requireActual('amplify-cli-core');
  return {
    ...original,
    stateManager: {
      getAppID: jest.fn().mockReturnValue('fake-app-id'),
      getCurrentEnvName: jest.fn().mockReturnValue('test')
    },
  };
});

describe('Test database secrets management', () => {
  const mockContext = {} as $TSAny as $TSContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('Returns correct path for secrets in parameter store for a database', () => {
    const usernamePath = getParameterStoreSecretPath('username', mockDatabase, mockAPIName);
    expect(usernamePath).toEqual('/amplify/fake-app-id/test/AMPLIFY_apimockapimockdatabase_username');

    const passwordPath = getParameterStoreSecretPath('password', mockDatabase, mockAPIName);
    expect(passwordPath).toEqual('/amplify/fake-app-id/test/AMPLIFY_apimockapimockdatabase_password');
  });

  it('Returns undefined if secrets do not exist in parameter store for a database', async () => {
    const fetchedSecrets = await getExistingConnectionSecrets(mockContext, mockDatabase, mockAPIName);
    expect(fetchedSecrets).not.toBeDefined();
  });
});