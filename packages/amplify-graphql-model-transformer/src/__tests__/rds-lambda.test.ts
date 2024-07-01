/* eslint-disable no-underscore-dangle */
import { GetParameterCommand, GetParameterCommandInput } from '@aws-sdk/client-ssm';
// @ts-ignore
import { run, _resetClientCachesForTestingOnly } from '../../rds-lambda/handler';

const ssmMockReturnValues: Record<string, string> = {
  '/amplify/sandbox/user-sandbox-hash/SQL_CONNECTION_STRING': 'mysql://SANDBOX:password@localhost:3306/database',
  '/amplify/shared/amplify-test/SQL_CONNECTION_STRING': 'mysql://SHARED:password@localhost:3306/database',
  '/amplify/sandbox/user-sandbox-hash/CUSTOM_SSL_CERT': 'SANDBOX SSL CERT',
  '/amplify/shared/amplify-test/CUSTOM_SSL_CERT': 'SHARED SSL CERT',
};

// Mock client-ssm
jest.mock('@aws-sdk/client-ssm', () => {
  return {
    __esModule: true,
    GetParameterCommand: jest.fn((input: GetParameterCommandInput) => {
      return {
        input,
      };
    }),
    SSMClient: jest.fn().mockImplementation(() => ({
      send: (command: GetParameterCommand) => {
        const name = command.input?.Name ?? 'name not found';
        if (!name) {
          return Promise.reject(new Error('Name not found'));
        }

        const value = ssmMockReturnValues[name];
        if (!value) {
          return Promise.reject(new Error('Value not found'));
        }

        return Promise.resolve({
          Parameter: {
            Name: name,
            Value: value,
          },
        });
      },
    })),
  };
});

jest.mock('rds-query-processor', () => {
  return {
    __esModule: true,
    getDBAdapter: jest.fn((config) => {
      return {
        executeRequest: jest.fn((event: any, debugMode: boolean) => ({
          _config: config,
          _event: event,
          _debugMode: debugMode,
        })),
      };
    }),
  };
});

describe('rds-lambda', () => {
  const getEventPayload = (): any => ({
    mockEvent: `mock event ${Date.now()}`,
  });

  // Reset all environment variables used in tests, to ensure we start from a clean slate each time
  const resetAllEnvVars = (): void => {
    delete process.env.AWS_DEFAULT_REGION;
    delete process.env.AWS_REGION;
    delete process.env.connectionString;
    delete process.env.CREDENTIAL_STORAGE_METHOD;
    delete process.env.DEBUG_MODE;
    delete process.env.SSL_CERT_SSM_PATH;
    delete process.env.SSM_ENDPOINT;
  };

  beforeEach(() => {
    resetAllEnvVars();
    _resetClientCachesForTestingOnly();
    process.env.AWS_DEFAULT_REGION = 'us-west-2';
    process.env.AWS_REGION = 'us-west-2';
    process.env.connectionString = '"/amplify/sandbox/user-sandbox-hash/SQL_CONNECTION_STRING"';
    process.env.CREDENTIAL_STORAGE_METHOD = 'SSM';
    process.env.SSM_ENDPOINT = 'ssm.us-east-2.amazonaws.com';
  });

  it('invokes the lambda layer business logic', async () => {
    const payload = getEventPayload();
    const result = await run(payload);
    expect(result).toBeDefined();
    expect(result._config).toEqual({
      connectionString: 'mysql://SANDBOX:password@localhost:3306/database',
    });
    expect(result._debugMode).toEqual(false);
    expect(result._event).toEqual(payload);
  });

  it('respects the DEBUG_MODE env variable', async () => {
    const payload = getEventPayload();
    process.env.DEBUG_MODE = 'true';

    const result = await run(payload);
    expect(result).toBeDefined();
    expect(result._config).toEqual({
      connectionString: 'mysql://SANDBOX:password@localhost:3306/database',
    });
    expect(result._debugMode).toEqual(true);
    expect(result._event).toEqual(payload);
  });

  it('handles a JSON-stringified array of connection string SSM paths', async () => {
    const payload = getEventPayload();
    process.env.connectionString =
      '["/amplify/sandbox/user-sandbox-hash/SQL_CONNECTION_STRING","/amplify/shared/amplify-test/SQL_CONNECTION_STRING"]';

    const result = await run(payload);
    expect(result).toBeDefined();
    expect(result._config).toEqual({
      connectionString: 'mysql://SANDBOX:password@localhost:3306/database',
    });
    expect(result._debugMode).toEqual(false);
    expect(result._event).toEqual(payload);
  });

  it('handles a single JSON-stringified connection string SSM path', async () => {
    const payload = getEventPayload();
    process.env.connectionString = '"/amplify/shared/amplify-test/SQL_CONNECTION_STRING"';

    const result = await run(payload);
    expect(result).toBeDefined();
    expect(result._config).toEqual({
      connectionString: 'mysql://SHARED:password@localhost:3306/database',
    });
    expect(result._debugMode).toEqual(false);
    expect(result._event).toEqual(payload);
  });

  it('resolves connection string SSM paths in the specified order', async () => {
    const payload = getEventPayload();
    process.env.connectionString =
      '["NON-EXISTENT","/amplify/shared/amplify-test/SQL_CONNECTION_STRING","/amplify/sandbox/user-sandbox-hash/SQL_CONNECTION_STRING"]';

    const result = await run(payload);
    expect(result).toBeDefined();
    expect(result._config).toEqual({
      connectionString: 'mysql://SHARED:password@localhost:3306/database',
    });
    expect(result._debugMode).toEqual(false);
    expect(result._event).toEqual(payload);
  });

  it('invokes the lambda layer with a custom SSL cert', async () => {
    const payload = getEventPayload();
    process.env.SSL_CERT_SSM_PATH = '"/amplify/sandbox/user-sandbox-hash/CUSTOM_SSL_CERT"';
    const result = await run(payload);
    expect(result).toBeDefined();
    expect(result._config).toEqual({
      sslCertificate: 'SANDBOX SSL CERT',
      connectionString: 'mysql://SANDBOX:password@localhost:3306/database',
    });
    expect(result._debugMode).toEqual(false);
    expect(result._event).toEqual(payload);
  });

  it('resolves SSL cert SSM Path strings in the specified order, without changing connection string resolution', async () => {
    const payload = getEventPayload();
    process.env.SSL_CERT_SSM_PATH =
      '["NON-EXISTENT","/amplify/shared/amplify-test/CUSTOM_SSL_CERT","/amplify/sandbox/user-sandbox-hash/CUSTOM_SSL_CERT"]';

    const result = await run(payload);
    expect(result).toBeDefined();
    expect(result._config).toEqual({
      sslCertificate: 'SHARED SSL CERT',
      connectionString: 'mysql://SANDBOX:password@localhost:3306/database',
    });
    expect(result._debugMode).toEqual(false);
    expect(result._event).toEqual(payload);
  });

  it('throws an SSL-specific error if passed a non-existent SSM path for SSL certificate', async () => {
    const payload = getEventPayload();
    process.env.SSL_CERT_SSM_PATH = 'NON-EXISTENT';
    await expect(run(payload)).rejects.toThrow('Unable to get the custom SSL certificate. Check the logs for more details.');
  });
});
