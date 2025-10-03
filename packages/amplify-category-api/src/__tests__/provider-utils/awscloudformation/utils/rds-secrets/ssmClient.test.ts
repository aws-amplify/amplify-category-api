import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { SSMClient } from '../../../../../provider-utils/awscloudformation/utils/rds-resources/ssmClient';
import {
  DeleteParameterCommand,
  DeleteParametersCommand,
  GetParametersCommand,
  PutParameterCommand,
  SSMClient as SSM_Client,
} from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const secretName = 'mock-test-secret-name';
const secretValue = 'mock-test-secret-value';

const mockSSMClient = mockClient(SSM_Client);

describe('SSM V3 Client Configuration', () => {
  const mockContext = {
    amplify: {
      invokePluginMethod: jest.fn().mockResolvedValue({ client: new SSM_Client({}) }),
    },
  } as any as $TSContext;

  beforeEach(() => {
    mockSSMClient.reset();
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
    expect(mockSSMClient).toHaveReceivedCommandWith(PutParameterCommand, {
      Name: secretName,
      Overwrite: true,
      Type: 'SecureString',
      Value: secretValue,
    });
  });

  test('able to get the secret value', async () => {
    mockSSMClient.on(GetParametersCommand).resolves({
      Parameters: [{ Name: secretName, Value: secretValue }],
    });

    const ssmClient = await SSMClient.getInstance(mockContext);
    const result = await ssmClient.getSecrets([secretName]);

    expect(mockSSMClient).toHaveReceivedCommandWith(GetParametersCommand, {
      Names: [secretName],
      WithDecryption: true,
    });
    expect(result).toEqual([{ secretName: secretName, secretValue: secretValue }]);
  });

  test('able to delete the secret', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    await ssmClient.deleteSecret(secretName);
    expect(mockSSMClient).toHaveReceivedCommandWith(DeleteParameterCommand, {
      Name: secretName,
    });
  });

  test('able to delete multiple secrets', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    await ssmClient.deleteSecrets([secretName]);
    expect(mockSSMClient).toHaveReceivedCommandWith(DeleteParametersCommand, {
      Names: [secretName],
    });
  });
});
