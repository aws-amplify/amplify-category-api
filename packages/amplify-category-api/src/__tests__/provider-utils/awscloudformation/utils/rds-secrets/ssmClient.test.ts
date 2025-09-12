import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { SSMClient } from '../../../../../provider-utils/awscloudformation/utils/rds-resources/ssmClient';
import { SSMClient as AWSSSMClient } from '@aws-sdk/client-ssm';

const secretName = 'mock-test-secret-name';
const secretValue = 'mock-test-secret-value';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-ssm', () => {
  return {
    SSMClient: jest.fn(() => ({
      send: mockSend,
    })),
    PutParameterCommand: jest.fn(),
    DeleteParameterCommand: jest.fn(),
    DeleteParametersCommand: jest.fn(),
    GetParametersCommand: jest.fn(),
    GetParametersByPathCommand: jest.fn(),
  };
});

describe('SSM client configuration', () => {
  const mockContext = {
    amplify: {
      invokePluginMethod: jest.fn().mockResolvedValue({ client: new AWSSSMClient({}) }),
    },
  } as any as $TSContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('able to get the configured SSM instance via provider plugin', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    expect(ssmClient).toBeDefined();
    expect(mockContext.amplify.invokePluginMethod).toBeCalledTimes(1);
    expect(mockContext.amplify.invokePluginMethod).toBeCalledWith(mockContext, 'awscloudformation', undefined, 'getConfiguredSSMClient', [
      mockContext,
    ]);
  });

  test('able to set the secret value', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);

    await ssmClient.setSecret(secretName, secretValue);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('able to get the secret value', async () => {
    mockSend.mockResolvedValueOnce({
      Parameters: [{ Name: secretName, Value: secretValue }],
    });

    const ssmClient = await SSMClient.getInstance(mockContext);
    const result = await ssmClient.getSecrets([secretName]);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ secretName: secretName, secretValue: secretValue }]);
  });

  test('able to delete the secret', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    await ssmClient.deleteSecret(secretName);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test('able to delete multiple secrets', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    await ssmClient.deleteSecrets([secretName]);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
