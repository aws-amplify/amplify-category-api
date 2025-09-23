import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { SSMClient } from '../../../../../provider-utils/awscloudformation/utils/rds-resources/ssmClient';
import aws from 'aws-sdk';
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
const mockPutParameter = jest.fn(({ Name, Value, Type, Overwrite }) => {
  return { promise: () => {} };
});
const mockDeleteParameter = jest.fn(({ Name }) => {
  return { promise: () => {} };
});
const mockDeleteParameters = jest.fn(({ Names }) => {
  return { promise: () => {} };
});
const mockGetParameters = jest.fn(({ Names }) => {
  return { promise: () => Promise.resolve({ Parameters: [{ Name: secretName, Value: secretValue }] }) };
});

jest.mock('aws-sdk', () => {
  return {
    config: {
      // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
      update() {
        return {};
      },
    },
    SSM: jest.fn(() => {
      return {
        putParameter: mockPutParameter,
        deleteParameter: mockDeleteParameter,
        deleteParameters: mockDeleteParameters,
        getParameters: mockGetParameters,
      };
    }),
  };
});

const mockSSMClient = mockClient(SSM_Client);

describe('SSM client configuration', () => {
  const mockContext = {
    amplify: {
      invokePluginMethod: jest.fn().mockResolvedValue({ client: new aws.SSM() }),
    },
  } as any as $TSContext;

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

    ssmClient.setSecret(secretName, secretValue);
    expect(mockPutParameter).toBeCalledWith({
      Name: secretName,
      Overwrite: true,
      Type: 'SecureString',
      Value: secretValue,
    });
  });

  test('able to get the secret value', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    const result = await ssmClient.getSecrets([secretName]);

    expect(mockGetParameters).toBeCalledWith({
      Names: [secretName],
      WithDecryption: true,
    });
    expect(result).toEqual([{ secretName: secretName, secretValue: secretValue }]);
  });

  test('able to delete the secret', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    ssmClient.deleteSecret(secretName);
    expect(mockDeleteParameter).toBeCalledWith({
      Name: secretName,
    });
  });

  test('able to delete multiple secrets', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    ssmClient.deleteSecrets([secretName]);
    expect(mockDeleteParameters).toBeCalledWith({
      Names: [secretName],
    });
  });
});

describe('SSM V3 Client Configuration', () => {
  const mockContext = {
    amplify: {
      invokePluginMethod: jest.fn().mockResolvedValue({ client: new SSM_Client() }),
    },
  } as any as $TSContext;

  beforeEach(() => {
    mockSSMClient.reset();
    mockSSMClient.on(PutParameterCommand).resolves({});
    mockSSMClient.on(GetParametersCommand).resolves({
      Parameters: [{ Name: secretName, Value: secretValue }],
    });
    mockSSMClient.on(DeleteParameterCommand).resolves({});
    mockSSMClient.on(DeleteParameterCommand).resolves({});
  });

  test('able to get the configured SSM instance via provider plugin', async () => {
    (SSMClient as any).instance = undefined;
    const ssmClient = await SSMClient.getInstance(mockContext);
    expect(ssmClient).toBeDefined();
    expect(mockContext.amplify.invokePluginMethod).toBeCalledTimes(1);
    expect(mockContext.amplify.invokePluginMethod).toBeCalledWith(mockContext, 'awscloudformation', undefined, 'getConfiguredSSMClient', [
      mockContext,
    ]);
  });

  test('able to set the secret value', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);

    ssmClient.setSecret(secretName, secretValue);
    expect(mockSSMClient).toHaveReceivedCommandWith(PutParameterCommand, {
      Name: secretName,
      Overwrite: true,
      Type: 'SecureString',
      Value: secretValue,
    });
  });

  test('able to get the secret value', async () => {
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
    ssmClient.deleteSecret(secretName);
    expect(mockSSMClient).toHaveReceivedCommandWith(DeleteParameterCommand, {
      Name: secretName,
    });
  });

  test('able to delete multiple secrets', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    ssmClient.deleteSecrets([secretName]);
    expect(mockSSMClient).toHaveReceivedCommandWith(DeleteParametersCommand, {
      Names: [secretName],
    });
  });
});
