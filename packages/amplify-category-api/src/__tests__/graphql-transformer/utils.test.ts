import * as path from 'path';
import * as fs from 'fs-extra';
import { $TSContext, CloudformationProviderFacade, pathManager, JSONUtilities } from '@aws-amplify/amplify-cli-core';
import { mergeUserConfigWithTransformOutput, writeDeploymentToDisk, getAdminRoles } from '../../graphql-transformer/utils';
import { TransformerProjectConfig } from '../../graphql-transformer/cdk-compat/project-config';
import { DeploymentResources } from '../../graphql-transformer/cdk-compat/deployment-resources';

jest.mock('fs-extra');
jest.mock('@aws-amplify/amplify-cli-core');

const fs_mock = fs as jest.Mocked<typeof fs>;
const prePushCfnTemplateModifier_mock = jest.fn();

CloudformationProviderFacade.prePushCfnTemplateModifier = prePushCfnTemplateModifier_mock;

fs_mock.readdirSync.mockReturnValue([]);

describe('graphql transformer utils', () => {
  let userConfig: TransformerProjectConfig;
  let transformerOutput: DeploymentResources;

  beforeEach(() => {
    transformerOutput = {
      userOverriddenSlots: [],
      resolvers: {
        'Query.listTodos.req.vtl': '## [Start] List Request. **\n' + '#set( $limit = $util.defaultIfNull($context.args.limit, 100) )\n',
      },
      pipelineFunctions: {},
      functions: {},
      schema: '',
      stackMapping: {},
      stacks: {},
      rootStack: {
        Parameters: {},
        Resources: {},
      },
    } as DeploymentResources;
  });

  describe('writeDeploymentToDisk', () => {
    it('executes the CFN pre-push processor on nested api stacks before writing to disk', async () => {
      transformerOutput.stacks['TestStack'] = { Resources: { TestResource: { Type: 'testtest' } } };
      transformerOutput.resolvers = {};
      let hasTransformedTemplate = false;
      let hasWrittenTransformedTemplate = false;
      prePushCfnTemplateModifier_mock.mockImplementation(async () => {
        hasTransformedTemplate = true;
      });
      fs_mock.writeFileSync.mockImplementation((filepath) => {
        if (typeof filepath === 'string' && filepath.includes(`${path.sep}stacks${path.sep}`)) {
          if (hasTransformedTemplate) {
            hasWrittenTransformedTemplate = true;
          } else {
            throw new Error('prePushCfnTemplateModifier was not applied to template before writing to disk');
          }
        }
      });

      const context = { amplify: {} } as unknown as $TSContext;
      await writeDeploymentToDisk(context, transformerOutput, path.join('test', 'deployment'), undefined, {});
      expect(hasWrittenTransformedTemplate).toBe(true);
    });
  });

  describe('mergeUserConfigWithTransformOutput', () => {
    describe('has user created functions', () => {
      beforeAll(() => {
        userConfig = {
          schema: '',
          functions: {
            userFn: 'userFn()',
          },
          pipelineFunctions: {},
          resolvers: {},
          stacks: {},
          dataSourceStrategies: {},
          config: { Version: 5, ElasticsearchWarning: true },
        } as TransformerProjectConfig;
      });

      it('merges function with transform output functions', () => {
        const { functions } = mergeUserConfigWithTransformOutput(userConfig, transformerOutput);

        expect(functions['userFn']).toEqual('userFn()');
      });
    });

    describe('has user-created resolvers', () => {
      beforeAll(() => {
        userConfig = {
          schema: '',
          functions: {},
          pipelineFunctions: {},
          resolvers: {
            'Query.listTodos.req.vtl': '$util.unauthorized\n',
          },
          stacks: {},
          dataSourceStrategies: {},
          config: { Version: 5, ElasticsearchWarning: true },
        } as TransformerProjectConfig;
      });

      it('merges the custom resolver with transformer output', () => {
        const output = mergeUserConfigWithTransformOutput(userConfig, transformerOutput);

        expect(output.resolvers['Query.listTodos.req.vtl']).toEqual('$util.unauthorized\n');
      });
    });

    describe('has user created pipeline function', () => {
      beforeAll(() => {
        userConfig = {
          schema: '',
          functions: {},
          pipelineFunctions: {
            'Query.listTodos.req.vtl': '$util.unauthorized\n',
          },
          resolvers: {},
          stacks: {},
          dataSourceStrategies: {},
          config: { Version: 5, ElasticsearchWarning: true },
        } as TransformerProjectConfig;
      });

      it('merges custom pipeline function with transformer output', () => {
        const { resolvers } = mergeUserConfigWithTransformOutput(userConfig, transformerOutput);

        expect(resolvers['Query.listTodos.req.vtl']).toEqual('$util.unauthorized\n');
      });
    });

    describe('has user created stacks', () => {
      beforeAll(() => {
        userConfig = {
          schema: '',
          functions: {},
          pipelineFunctions: {},
          resolvers: {},
          stacks: {
            'CustomResources.json': {
              Resources: {
                QueryCommentsForTodoResolver: {
                  Type: 'AWS::AppSync::Resolver',
                  Properties: {
                    ApiId: {
                      Ref: 'AppSyncApiId',
                    },
                    DataSourceName: 'CommentTable',
                    TypeName: 'Query',
                    FieldName: 'commentsForTodo',
                    RequestMappingTemplateS3Location: {
                      'Fn::Sub': [
                        's3://${S3DeploymentBucket}/${S3DeploymentRootKey}/pipelineFunctions/Query.commentsForTodo.req.vtl',
                        {
                          S3DeploymentBucket: {
                            Ref: 'S3DeploymentBucket',
                          },
                          S3DeploymentRootKey: {
                            Ref: 'S3DeploymentRootKey',
                          },
                        },
                      ],
                    },
                    ResponseMappingTemplateS3Location: {
                      'Fn::Sub': [
                        's3://${S3DeploymentBucket}/${S3DeploymentRootKey}/pipelineFunctions/Query.commentsForTodo.res.vtl',
                        {
                          S3DeploymentBucket: {
                            Ref: 'S3DeploymentBucket',
                          },
                          S3DeploymentRootKey: {
                            Ref: 'S3DeploymentRootKey',
                          },
                        },
                      ],
                    },
                  },
                },
              },
              Parameters: {
                AppSyncApiId: {
                  Type: 'String',
                  Description: 'The id of the AppSync API associated with this project.',
                },
                AppSyncApiName: {
                  Type: 'String',
                  Description: 'The name of the AppSync API',
                  Default: 'AppSyncSimpleTransform',
                },
                env: {
                  Type: 'String',
                  Description: 'The environment name. e.g. Dev, Test, or Production',
                  Default: 'NONE',
                },
                S3DeploymentBucket: {
                  Type: 'String',
                  Description: 'The S3 bucket containing all deployment assets for the project.',
                },
                S3DeploymentRootKey: {
                  Type: 'String',
                  Description: 'An S3 key relative to the S3DeploymentBucket that points to the root\n' + 'of the deployment directory.',
                },
              },
            },
          },
          dataSourceStrategies: {},
          config: { Version: 5, ElasticsearchWarning: true },
        } as unknown as TransformerProjectConfig;
      });

      it('merges custom pipeline function with transformer output', () => {
        const { stacks } = mergeUserConfigWithTransformOutput(userConfig, transformerOutput);

        expect(stacks).toEqual({
          'CustomResources.json': {
            Resources: {
              QueryCommentsForTodoResolver: {
                Type: 'AWS::AppSync::Resolver',
                Properties: {
                  ApiId: {
                    Ref: 'AppSyncApiId',
                  },
                  DataSourceName: 'CommentTable',
                  TypeName: 'Query',
                  FieldName: 'commentsForTodo',
                  RequestMappingTemplateS3Location: {
                    'Fn::Sub': [
                      's3://${S3DeploymentBucket}/${S3DeploymentRootKey}/pipelineFunctions/Query.commentsForTodo.req.vtl',
                      {
                        S3DeploymentBucket: {
                          Ref: 'S3DeploymentBucket',
                        },
                        S3DeploymentRootKey: {
                          Ref: 'S3DeploymentRootKey',
                        },
                      },
                    ],
                  },
                  ResponseMappingTemplateS3Location: {
                    'Fn::Sub': [
                      's3://${S3DeploymentBucket}/${S3DeploymentRootKey}/pipelineFunctions/Query.commentsForTodo.res.vtl',
                      {
                        S3DeploymentBucket: {
                          Ref: 'S3DeploymentBucket',
                        },
                        S3DeploymentRootKey: {
                          Ref: 'S3DeploymentRootKey',
                        },
                      },
                    ],
                  },
                },
              },
            },
            Parameters: {
              AppSyncApiId: {
                Type: 'String',
                Description: 'The id of the AppSync API associated with this project.',
              },
              AppSyncApiName: {
                Type: 'String',
                Description: 'The name of the AppSync API',
                Default: 'AppSyncSimpleTransform',
              },
              env: {
                Type: 'String',
                Description: 'The environment name. e.g. Dev, Test, or Production',
                Default: 'NONE',
              },
              S3DeploymentBucket: {
                Type: 'String',
                Description: 'The S3 bucket containing all deployment assets for the project.',
              },
              S3DeploymentRootKey: {
                Type: 'String',
                Description: 'An S3 key relative to the S3DeploymentBucket that points to the root\n' + 'of the deployment directory.',
              },
            },
          },
        });
      });
    });
  });

  describe('read Admin role names from custom-roles.json', () => {
    const pathManagerMock = pathManager as jest.Mocked<typeof pathManager>;
    pathManagerMock.getResourceDirectoryPath.mockReturnValue('mockdir');
    const mockContext = {
      amplify: {
        getEnvInfo: () => ({
          envName: 'test',
        }),
        getResourceStatus: () => ({
          allResources: [],
          resourcesToBeDeleted: [],
        }),
      },
    } as unknown as $TSContext;

    it('should return empty array if custom-roles.json does not exist', async () => {
      fs_mock.existsSync.mockReturnValueOnce(false);
      const adminRoles = await getAdminRoles(mockContext, 'test');
      expect(adminRoles).toEqual([]);
    });

    it('should return empty array if custom-roles.json does not contain admin roles', async () => {
      const JSONUtilitiesMock = JSONUtilities as jest.Mocked<typeof JSONUtilities>;
      JSONUtilitiesMock.readJson.mockReturnValueOnce({
        adminRoleNames: [],
      });
      fs_mock.existsSync.mockReturnValueOnce(true);
      const adminRoles = await getAdminRoles(mockContext, 'test');
      expect(adminRoles).toEqual([]);
    });

    it('should return admin roles if present as array in custom-roles.json', async () => {
      const JSONUtilitiesMock = JSONUtilities as jest.Mocked<typeof JSONUtilities>;
      const testRole = 'my-custom-role';
      JSONUtilitiesMock.readJson.mockReturnValueOnce({
        adminRoleNames: [testRole],
      });
      fs_mock.existsSync.mockReturnValueOnce(true);
      const adminRoles = await getAdminRoles(mockContext, 'test');
      expect(adminRoles).toEqual([testRole]);
    });

    it('should return admin roles if present as string in custom-roles.json', async () => {
      const JSONUtilitiesMock = JSONUtilities as jest.Mocked<typeof JSONUtilities>;
      const testRole = 'my-custom-role';
      JSONUtilitiesMock.readJson.mockReturnValueOnce({
        adminRoleNames: testRole,
      });
      fs_mock.existsSync.mockReturnValueOnce(true);
      const adminRoles = await getAdminRoles(mockContext, 'test');
      expect(adminRoles).toEqual([testRole]);
    });
  });
});
