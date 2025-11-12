import { $TSContext, FeatureFlags, success } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { readProjectConfiguration, collectDirectivesByTypeNames, readTransformerConfiguration } from 'graphql-transformer-core';
import { transformGraphQLSchemaV1 } from '../../graphql-transformer/transform-graphql-schema-v1';

jest.mock('@aws-amplify/amplify-cli-core');
jest.mock('@aws-amplify/amplify-prompts');
jest.mock('graphql-transformer-core');

describe('transformGraphQLSchemaV1', () => {
  const printerMock = printer as jest.Mocked<typeof printer>;
  const readProjectConfigurationMock = readProjectConfiguration as jest.Mock;
  const collectDirectivesByTypeNamesMock = collectDirectivesByTypeNames as jest.Mock;
  const readTransformerConfigurationMock = readTransformerConfiguration as jest.Mock;
  const FeatureFlagsMock = FeatureFlags as jest.Mocked<typeof FeatureFlags>;

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  test('does not allow gen 2 migrations on v1 transformer', async () => {
    readProjectConfigurationMock.mockReturnValue({
      schema: '',
    });
    collectDirectivesByTypeNamesMock.mockReturnValue({
      types: [],
      directives: [],
    });
    readTransformerConfigurationMock.mockReturnValue({});
    FeatureFlagsMock.getBoolean.mockReturnValue(true);
    const contextMock = {
      amplify: {
        invokePluginMethod: jest.fn(),
        getResourceStatus: jest.fn(() => ({
          resourcesToBeCreated: [
            {
              service: 'AppSync',
              providerPlugin: 'awscloudformation',
              resourceName: 'mock resource',
              category: 'api',
              output: {},
            },
          ],
          resourcesToBeUpdated: [],
          allResources: [],
        })),
        pathManager: {
          getBackendDirPath: jest.fn(() => 'amplify'),
          getCurrentCloudBackendDirPath: jest.fn(() => 'amplify'),
        },
      },
      parameters: {
        options: { resourcesDir: 'resourceDir', projectDirectory: __dirname },
      },
      print: {
        success: jest.fn(),
      },
    } as unknown as $TSContext;
    await expect(() => transformGraphQLSchemaV1(contextMock, { dryRun: true, parameters: {} })).rejects.toThrow(
      'V1 transformer is not supported for Amplify Gen 2 migrations. Migrate to V2 transformer first.',
    );

    // v1 transformer works when not enabling gen 2 migrations
    FeatureFlagsMock.getBoolean.mockReturnValue(false);
    await transformGraphQLSchemaV1(contextMock, { dryRun: true, parameters: {} });
  });
});
