import { $TSContext, FeatureFlags } from '@aws-amplify/amplify-cli-core';
import { readProjectConfiguration, collectDirectivesByTypeNames, readTransformerConfiguration } from 'graphql-transformer-core';
import { transformGraphQLSchemaV1 } from '../../graphql-transformer/transform-graphql-schema-v1';

jest.mock('@aws-amplify/amplify-cli-core');
jest.mock('graphql-transformer-core');

describe('transformGraphQLSchemaV1', () => {
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
    } as unknown as $TSContext;
    expect(() => transformGraphQLSchemaV1(contextMock, { dryRun: true, parameters: {} })).rejects.toThrowError(
      'V1 transformer is not supported for Amplify Gen 2 migrations. Migrate to V2 transformer first.',
    );
  });
});
