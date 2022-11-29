import { $TSAny, $TSContext } from 'amplify-cli-core';
import { SSMClient } from '../../../../../provider-utils/awscloudformation/utils/rds-secrets/ssmClient';
import aws from 'aws-sdk';

const mockPutParameter = jest.fn(({ Name, Value, Type, Overwrite }) => {
  return {
    promise: () => {},
  };
});

jest.mock('aws-sdk', () => {
  return {
    config: {
      update() {
        return {};
      },
    },
    SSM: jest.fn(() => {
      return {
        putParameter: mockPutParameter
      };
    }),
  };
});

describe('SSM client configuration', () => {
  const mockContext = {
    amplify: {
      invokePluginMethod: jest.fn().mockResolvedValue({ client: new aws.SSM()})
    }
  } as $TSAny as $TSContext;

  test('able to get the configured SSM instance via provider plugin', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    expect(ssmClient).toBeDefined();
    expect(mockContext.amplify.invokePluginMethod).toBeCalledTimes(1);
    expect(mockContext.amplify.invokePluginMethod).toBeCalledWith(mockContext, 'awscloudformation', undefined, 'getConfiguredSSMClient', [mockContext]);
  });

  test('able to set the secret value', async () => {
    const ssmClient = await SSMClient.getInstance(mockContext);
    const secretName = 'mock-test-secret-name';
    const secretValue = 'mock-test-secret-value';
    
    ssmClient.setSecret(secretName, secretValue);
    expect(mockPutParameter).toBeCalledWith({
      Name: secretName,
      Overwrite: true,
      Type: 'SecureString',
      Value: secretValue
    });
  });
});
