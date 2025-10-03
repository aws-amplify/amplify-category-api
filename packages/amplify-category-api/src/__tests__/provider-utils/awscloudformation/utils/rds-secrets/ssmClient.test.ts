import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { SSMClient } from '../../../../../provider-utils/awscloudformation/utils/rds-resources/ssmClient';
import {
  DeleteParameterCommand,
  DeleteParametersCommand,
  GetParametersCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
  SSMClient as SSM_Client,
} from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const secretName = 'mock-test-secret-name';
const secretValue = 'mock-test-secret-value';
const secretPath = '/test/path';

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

  test('able to get secrets returns empty array when no secrets provided', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    const result = await ssmClient.getSecrets([]);

    expect(result).toEqual([]);
    expect(mockSSMClient).not.toHaveReceivedCommand(GetParametersCommand);
  });

  test('able to get secrets returns empty array when null secrets provided', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    const result = await ssmClient.getSecrets(null);

    expect(result).toEqual([]);
    expect(mockSSMClient).not.toHaveReceivedCommand(GetParametersCommand);
  });

  test('able to get secret names by path', async () => {
    mockSSMClient.on(GetParametersByPathCommand).resolves({
      Parameters: [{ Name: `${secretPath}/secret1` }, { Name: `${secretPath}/secret2` }],
    });

    const ssmClient = await SSMClient.getInstance(mockContext);
    const result = await ssmClient.getSecretNamesByPath(secretPath);

    expect(mockSSMClient).toHaveReceivedCommandWith(GetParametersByPathCommand, {
      Path: secretPath,
      MaxResults: 10,
      ParameterFilters: [
        {
          Key: 'Type',
          Option: 'Equals',
          Values: ['SecureString'],
        },
      ],
      NextToken: undefined,
    });
    expect(result).toEqual([`${secretPath}/secret1`, `${secretPath}/secret2`]);
  });

  test('able to get secret names by path with pagination', async () => {
    mockSSMClient
      .on(GetParametersByPathCommand)
      .resolvesOnce({
        Parameters: [{ Name: `${secretPath}/secret1` }],
        NextToken: 'token1',
      })
      .resolvesOnce({
        Parameters: [{ Name: `${secretPath}/secret2` }],
      });

    const ssmClient = await SSMClient.getInstance(mockContext);
    const result = await ssmClient.getSecretNamesByPath(secretPath);

    expect(mockSSMClient).toHaveReceivedCommandTimes(GetParametersByPathCommand, 2);
    expect(result).toEqual([`${secretPath}/secret1`, `${secretPath}/secret2`]);
  });

  test('able to delete the secret', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    await ssmClient.deleteSecret(secretName);
    expect(mockSSMClient).toHaveReceivedCommandWith(DeleteParameterCommand, {
      Name: secretName,
    });
  });

  test('able to delete secret handles ParameterNotFound error', async () => {
    mockSSMClient.on(DeleteParameterCommand).rejects({
      name: 'ParameterNotFound',
      message: 'Parameter not found',
    });

    const ssmClient = await SSMClient.getInstance(mockContext);

    // Should not throw error for ParameterNotFound
    await expect(ssmClient.deleteSecret(secretName)).resolves.not.toThrow();

    expect(mockSSMClient).toHaveReceivedCommandWith(DeleteParameterCommand, {
      Name: secretName,
    });
  });

  test('able to delete secret throws other errors', async () => {
    mockSSMClient.on(DeleteParameterCommand).rejects({
      name: 'AccessDenied',
      message: 'Access denied',
    });

    const ssmClient = await SSMClient.getInstance(mockContext);

    await expect(ssmClient.deleteSecret(secretName)).rejects.toMatchObject({
      name: 'AccessDenied',
    });
  });

  test('able to delete multiple secrets', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    await ssmClient.deleteSecrets([secretName]);
    expect(mockSSMClient).toHaveReceivedCommandWith(DeleteParametersCommand, {
      Names: [secretName],
    });
  });

  test('able to delete multiple secrets handles ParameterNotFound error', async () => {
    mockSSMClient.on(DeleteParametersCommand).rejects({
      name: 'ParameterNotFound',
      message: 'Parameter not found',
    });

    const ssmClient = await SSMClient.getInstance(mockContext);

    // Should not throw error for ParameterNotFound
    await expect(ssmClient.deleteSecrets([secretName])).resolves.not.toThrow();

    expect(mockSSMClient).toHaveReceivedCommandWith(DeleteParametersCommand, {
      Names: [secretName],
    });
  });

  test('able to delete multiple secrets throws other errors', async () => {
    mockSSMClient.on(DeleteParametersCommand).rejects({
      name: 'AccessDenied',
      message: 'Access denied',
    });

    const ssmClient = await SSMClient.getInstance(mockContext);

    await expect(ssmClient.deleteSecrets([secretName])).rejects.toMatchObject({
      name: 'AccessDenied',
    });
  });
});
