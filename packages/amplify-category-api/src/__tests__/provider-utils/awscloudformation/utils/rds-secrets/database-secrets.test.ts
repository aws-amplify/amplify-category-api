import { $TSAny, $TSContext, stateManager } from 'amplify-cli-core';
import { getExistingConnectionSecrets, storeConnectionSecrets, getParameterStoreSecretPath } from '../../../../../provider-utils/awscloudformation/utils/rds-secrets/database-secrets';

const mockDatabase = 'mockdatabase';

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
    const usernamePath = getParameterStoreSecretPath('username', mockDatabase);
    expect(usernamePath).toEqual('/amplify/fake-app-id/test/mockdatabase/AMPLIFY_username');

    const passwordPath = getParameterStoreSecretPath('password', mockDatabase);
    expect(passwordPath).toEqual('/amplify/fake-app-id/test/mockdatabase/AMPLIFY_password');
  });

  it('Returns undefined if secrets do not exist in parameter store for a database', async () => {
    const fetchedSecrets = await getExistingConnectionSecrets(mockContext, mockDatabase);
    expect(fetchedSecrets).not.toBeDefined();
  });
});