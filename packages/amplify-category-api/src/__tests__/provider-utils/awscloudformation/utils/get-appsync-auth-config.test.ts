import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { getAuthConfig } from '../../../../provider-utils/awscloudformation/utils/get-appsync-auth-config';

const getCLIInputPayload_mock = jest
  .fn()
  .mockReturnValueOnce({
    version: 1,
    serviceConfiguration: {
      apiName: 'authv2migration1',
      serviceName: 'AppSync',
      defaultAuthType: {
        mode: 'AWS_IAM',
      },
      conflictResolution: {},
      additionalAuthTypes: [],
    },
  })
  .mockReturnValueOnce({
    version: 1,
    serviceConfiguration: {
      apiName: 'authv2migration1',
      serviceName: 'AppSync',
      defaultAuthType: {
        mode: 'AWS_IAM',
      },
      conflictResolution: {},
      additionalAuthTypes: [
        {
          mode: 'API_KEY',
          expirationTime: 7,
          keyDescription: '',
        },
      ],
    },
  });

jest.mock('../../../../provider-utils/awscloudformation/api-input-manager/appsync-api-input-state.ts', () => {
  return {
    AppsyncApiInputState: jest.fn().mockImplementation(() => {
      return {
        getCLIInputPayload: getCLIInputPayload_mock,
        cliInputFileExists: jest.fn().mockReturnValue(true),
      };
    }),
  };
});

const mockContext: $TSContext = {
  amplify: {
    getCategoryPluginInfo: (_context: $TSContext, category: string) => {
      return {
        packageLocation: `@aws-amplify/amplify-category-${category}`,
      };
    },
  },
  input: {
    options: {},
  },
} as unknown as $TSContext;

test('function with default auth config', async () => {
  expect(await getAuthConfig(mockContext, 'mockapiResource')).toMatchSnapshot();
});

test('function with default and additional auth config', async () => {
  expect(await getAuthConfig(mockContext, 'mockapiResource')).toMatchSnapshot();
});
