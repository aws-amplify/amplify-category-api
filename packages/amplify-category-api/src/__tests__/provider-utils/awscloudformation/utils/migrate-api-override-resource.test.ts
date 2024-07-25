import * as path from 'path';
import { JSONUtilities } from '@aws-amplify/amplify-cli-core';
import { migrateResourceToSupportOverride } from '../../../../provider-utils/awscloudformation/utils/migrate-api-override-resource';

jest.mock('@aws-amplify/amplify-prompts');
jest.mock('fs-extra');

jest.mock('@aws-amplify/amplify-cli-core', () => ({
  ...(jest.requireActual('@aws-amplify/amplify-cli-core') as {}),
  pathManager: {
    findProjectRoot: jest.fn().mockReturnValue('somePath'),
    getBackendDirPath: jest.fn().mockReturnValue('mockProjectPath'),
    getResourceDirectoryPath: jest.fn().mockReturnValue('mockProjectPath'),
  },
  stateManager: {
    getMeta: jest.fn().mockReturnValue({
      api: {
        apiunittests: {
          service: 'AppSync',
          providerPlugin: 'awscloudformation',
          output: {
            authConfig: {
              defaultAuthentication: {
                authenticationType: 'AMAZON_COGNITO_USER_POOLS',
                userPoolConfig: {
                  userPoolId: 'authapiunittests2778e848',
                },
              },
              additionalAuthenticationProviders: [
                {
                  authenticationType: 'AWS_IAM',
                },
              ],
            },
          },
        },
      },
    }),
  },
  JSONUtilities: {
    readJson: jest.fn().mockReturnValue({
      ResolverConfig: {
        project: {
          ConflictHandler: 'AUTOMERGE',
          ConflictDetection: 'VERSION',
        },
      },
    }),
    writeJson: jest.fn(),
  },
}));
test('migrate resource', async () => {
  const resourceName = 'apiunittests';
  migrateResourceToSupportOverride(resourceName);
  const expectedPath = path.join('mockProjectPath', 'cli-inputs.json');
  const expectedPayload = {
    version: 1,
    serviceConfiguration: {
      serviceName: 'AppSync',
      defaultAuthType: {
        mode: 'AMAZON_COGNITO_USER_POOLS',
        cognitoUserPoolId: 'authapiunittests2778e848',
      },
      additionalAuthTypes: [
        {
          mode: 'AWS_IAM',
        },
      ],
      conflictResolution: {
        defaultResolutionStrategy: {
          type: 'AUTOMERGE',
        },
      },
      apiName: 'apiunittests',
    },
  };
  expect(JSONUtilities.writeJson).toBeCalledWith(expectedPath, expectedPayload);
});
