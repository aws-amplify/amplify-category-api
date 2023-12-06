import { $TSContext, pathManager, ApiCategoryFacade } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { constructTransformerChain } from '@aws-amplify/graphql-transformer';
import { DataSourceType, DynamoDBProvisionStrategy } from 'graphql-transformer-core';
import { getUserOverridenSlots, transformGraphQLSchemaV2 } from '../../graphql-transformer/transform-graphql-schema-v2';
import { generateTransformerOptions } from '../../graphql-transformer/transformer-options-v2';
import { getAppSyncAPIName } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';

jest.mock('@aws-amplify/amplify-cli-core');
jest.mock('@aws-amplify/amplify-prompts');
jest.mock('graphql-transformer-core');
jest.mock('../../graphql-transformer/transformer-options-v2');
jest.mock('../../graphql-transformer/user-defined-slots');
jest.mock('../../provider-utils/awscloudformation/utils/amplify-meta-utils');

describe('transformGraphQLSchemaV2', () => {
  const printerMock = printer as jest.Mocked<typeof printer>;
  const pathManagerMock = pathManager as jest.Mocked<typeof pathManager>;
  const ApiCategoryFacadeMock = ApiCategoryFacade as jest.Mocked<typeof ApiCategoryFacade>;
  const generateTransformerOptionsMock = generateTransformerOptions as jest.Mock;
  const getAppSyncAPINameMock = getAppSyncAPIName as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  test('tranformer logs are passed up', async () => {
    const contextMock = {
      amplify: {
        getEnvInfo: jest.fn(),
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
        getProjectMeta: jest.fn(() => ({
          providers: {
            awscloudformation: {
              Region: 'us-east-1',
            },
          },
        })),
      },
      parameters: {
        options: { resourcesDir: 'resourceDir', projectDirectory: __dirname },
      },
      mergeResources: jest.fn(),
    } as unknown as $TSContext;
    pathManagerMock.getBackendDirPath.mockReturnValue('backenddir');
    pathManagerMock.getCurrentCloudBackendDirPath.mockReturnValue('currentcloudbackenddir');
    ApiCategoryFacadeMock.getTransformerVersion.mockReturnValue(Promise.resolve(2));

    const schema = `
          type Todo @model @auth(rules: [{ allow: owner }]) {
            content: String
          }
        `;
    // Intentionally generating the V1 flavor of the project config to emulate the Gen1 CLI flow. This is fixed up in the transformer
    const modelToDatasourceMap = new Map<string, DataSourceType>([
      [
        'Todo',
        {
          dbType: 'DYNAMODB',
          provisionDB: true,
          provisionStrategy: DynamoDBProvisionStrategy.DEFAULT,
        },
      ],
    ]);

    generateTransformerOptionsMock.mockReturnValue({
      projectConfig: {
        // schema that will generate auth warnings
        schema,
        config: { StackMapping: {} },
        modelToDatasourceMap,
      },
      transformersFactory: constructTransformerChain(),
      transformersFactoryArgs: {},
      dryRun: true,
      projectDirectory: __dirname,
      authConfig: {
        additionalAuthenticationProviders: [],
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
      },
      transformParameters: {
        shouldDeepMergeDirectiveConfigDefaults: false,
        useSubUsernameForDefaultIdentityClaim: false,
        populateOwnerFieldForStaticGroupAuth: false,
        secondaryKeyAsGSI: false,
        enableAutoIndexQueryNames: false,
        respectPrimaryKeyAttributesOnConnectionField: false,
      },
    });
    getAppSyncAPINameMock.mockReturnValue(['testapi']);

    await transformGraphQLSchemaV2(contextMock, {});
    expect(printerMock.warn).toBeCalledWith(
      " WARNING: Amplify CLI will change the default identity claim from 'username' to use 'sub::username'. To continue using only usernames, set 'identityClaim: \"username\"' on your 'owner' rules on your schema. The default will be officially switched with v9.0.0. To read more: https://docs.amplify.aws/cli/migration/identity-claim-changes/",
    );
    expect(printerMock.warn).toBeCalledWith(
      'WARNING: owners may reassign ownership for the following model(s) and role(s): Todo: [owner]. If this is not intentional, you may want to apply field-level authorization rules to these fields. To read more: https://docs.amplify.aws/cli/graphql/authorization-rules/#per-user--owner-based-data-access.',
    );
  });
});

describe('getUserOverridenSlots', () => {
  it('returns for empty request', () => {
    expect(getUserOverridenSlots({})).toEqual([]);
  });

  it('returns for request mapping template', () => {
    expect(
      getUserOverridenSlots({
        'Query.getTodo': [
          {
            resolverTypeName: 'Query',
            resolverFieldName: 'getTodo',
            slotName: 'preAuth',
            requestResolver: {
              fileName: 'Query.getTodo.preAuth.1.req.vtl',
              template: '$util.unauthorized()',
            },
          },
        ],
      }),
    ).toEqual(['Query.getTodo.preAuth.1.req.vtl']);
  });

  it('returns for response mapping template', () => {
    expect(
      getUserOverridenSlots({
        'Query.getTodo': [
          {
            resolverTypeName: 'Query',
            resolverFieldName: 'getTodo',
            slotName: 'preAuth',
            requestResolver: {
              fileName: 'Query.getTodo.preAuth.1.res.vtl',
              template: '$util.unauthorized()',
            },
          },
        ],
      }),
    ).toEqual(['Query.getTodo.preAuth.1.res.vtl']);
  });

  it('returns for both requets and response mapping template', () => {
    expect(
      getUserOverridenSlots({
        'Query.getTodo': [
          {
            resolverTypeName: 'Query',
            resolverFieldName: 'getTodo',
            slotName: 'preAuth',
            requestResolver: {
              fileName: 'Query.getTodo.preAuth.1.req.vtl',
              template: '$util.unauthorized()',
            },
          },
          {
            resolverTypeName: 'Query',
            resolverFieldName: 'getTodo',
            slotName: 'preAuth',
            responseResolver: {
              fileName: 'Query.getTodo.preAuth.1.res.vtl',
              template: '$util.unauthorized()',
            },
          },
        ],
      }),
    ).toEqual(['Query.getTodo.preAuth.1.req.vtl', 'Query.getTodo.preAuth.1.res.vtl']);
  });

  it('returns for multiple overridden resolvers', () => {
    expect(
      getUserOverridenSlots({
        'Query.getTodo': [
          {
            resolverTypeName: 'Query',
            resolverFieldName: 'getTodo',
            slotName: 'preAuth',
            requestResolver: {
              fileName: 'Query.getTodo.preAuth.1.req.vtl',
              template: '$util.unauthorized()',
            },
          },
          {
            resolverTypeName: 'Query',
            resolverFieldName: 'getTodo',
            slotName: 'preAuth',
            responseResolver: {
              fileName: 'Query.getTodo.preAuth.1.res.vtl',
              template: '$util.unauthorized()',
            },
          },
        ],
        'Query.listTodos': [
          {
            resolverTypeName: 'Query',
            resolverFieldName: 'listTodos',
            slotName: 'postDataLoad',
            requestResolver: {
              fileName: 'Query.listTodos.postDataLoad.1.req.vtl',
              template: '$util.unauthorized()',
            },
          },
        ],
      }),
    ).toEqual(['Query.getTodo.preAuth.1.req.vtl', 'Query.getTodo.preAuth.1.res.vtl', 'Query.listTodos.postDataLoad.1.req.vtl']);
  });

  // This doesn't seem to be what the system does, but type allows, so testing it.
  it('returns when set on the same object', () => {
    expect(
      getUserOverridenSlots({
        'Query.getTodo': [
          {
            resolverTypeName: 'Query',
            resolverFieldName: 'getTodo',
            slotName: 'preAuth',
            requestResolver: {
              fileName: 'Query.getTodo.preAuth.1.req.vtl',
              template: '$util.unauthorized()',
            },
            responseResolver: {
              fileName: 'Query.getTodo.preAuth.1.res.vtl',
              template: '$util.unauthorized()',
            },
          },
        ],
      }),
    ).toEqual(['Query.getTodo.preAuth.1.req.vtl', 'Query.getTodo.preAuth.1.res.vtl']);
  });
});
