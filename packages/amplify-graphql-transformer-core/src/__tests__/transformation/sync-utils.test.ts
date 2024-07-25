import { TransformerTransformSchemaStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { SynthParameters } from '@aws-amplify/graphql-transformer-interfaces/src';
import { CfnParameter } from 'aws-cdk-lib';
import { ConflictHandlerType, ResolverConfig, SyncConfigLambda } from '../../config/transformer-config';
import { getSyncConfig } from '../../transformation/sync-utils';

describe('getSyncConfig', () => {
  const createMockContext = (resolverConfig: ResolverConfig): TransformerTransformSchemaStepContextProvider =>
    ({
      getResolverConfig: () => resolverConfig,
      synthParameters: {
        amplifyEnvironmentName: 'test',
        apiName: 'gqlApi',
      } as SynthParameters,
      parameterManager: {
        getParameter: (_: string) => jest.fn() as unknown as CfnParameter,
      },
    } as unknown as TransformerTransformSchemaStepContextProvider);

  describe('lambda sync handler', () => {
    test('handles explicit arn passed in for project-level config', () => {
      const resolverConfig: ResolverConfig = {
        project: {
          ConflictDetection: 'NONE',
          ConflictHandler: ConflictHandlerType.LAMBDA,
          LambdaConflictHandler: {
            name: 'myFunctionName',
            region: 'myFunctionRegion',
            lambdaArn: 'myFunctionARN',
          },
        },
      };

      const syncConfig = getSyncConfig(createMockContext(resolverConfig), '') as SyncConfigLambda;

      expect(syncConfig).toBeDefined();
      expect(syncConfig?.ConflictHandler).toEqual(ConflictHandlerType.LAMBDA);
      expect(syncConfig?.LambdaConflictHandler.name).toEqual('myFunctionName');
      expect(syncConfig?.LambdaConflictHandler.region).toEqual('myFunctionRegion');
      expect(syncConfig?.LambdaConflictHandler.lambdaArn).toEqual('myFunctionARN');
    });

    test('handles explicit arn passed in for model-level config', () => {
      const resolverConfig: ResolverConfig = {
        models: {
          Blog: {
            ConflictDetection: 'NONE',
            ConflictHandler: ConflictHandlerType.LAMBDA,
            LambdaConflictHandler: {
              name: 'myFunctionNameBlog',
              region: 'myFunctionRegionBlog',
              lambdaArn: 'myFunctionARNBlog',
            },
          },
          Author: {
            ConflictDetection: 'NONE',
            ConflictHandler: ConflictHandlerType.LAMBDA,
            LambdaConflictHandler: {
              name: 'myFunctionNameAuthor',
              region: 'myFunctionRegionAuthor',
              lambdaArn: 'myFunctionARNAuthor',
            },
          },
        },
      };

      const blogSyncConfig = getSyncConfig(createMockContext(resolverConfig), 'Blog') as SyncConfigLambda;

      expect(blogSyncConfig).toBeDefined();
      expect(blogSyncConfig?.ConflictHandler).toEqual(ConflictHandlerType.LAMBDA);
      expect(blogSyncConfig?.LambdaConflictHandler.name).toEqual('myFunctionNameBlog');
      expect(blogSyncConfig?.LambdaConflictHandler.region).toEqual('myFunctionRegionBlog');
      expect(blogSyncConfig?.LambdaConflictHandler.lambdaArn).toEqual('myFunctionARNBlog');

      const authorSyncConfig = getSyncConfig(createMockContext(resolverConfig), 'Author') as SyncConfigLambda;

      expect(authorSyncConfig).toBeDefined();
      expect(authorSyncConfig?.ConflictHandler).toEqual(ConflictHandlerType.LAMBDA);
      expect(authorSyncConfig?.LambdaConflictHandler.name).toEqual('myFunctionNameAuthor');
      expect(authorSyncConfig?.LambdaConflictHandler.region).toEqual('myFunctionRegionAuthor');
      expect(authorSyncConfig?.LambdaConflictHandler.lambdaArn).toEqual('myFunctionARNAuthor');
    });

    test('generates arn reference if not provided for project-level config', () => {
      const resolverConfig: ResolverConfig = {
        project: {
          ConflictDetection: 'NONE',
          ConflictHandler: ConflictHandlerType.LAMBDA,
          LambdaConflictHandler: {
            // eslint-disable-next-line no-template-curly-in-string
            name: 'myFunctionName-${env}',
          },
        },
      };

      const syncConfig = getSyncConfig(createMockContext(resolverConfig), '') as SyncConfigLambda;

      expect(syncConfig).toBeDefined();
      expect(syncConfig?.ConflictHandler).toEqual(ConflictHandlerType.LAMBDA);
      // eslint-disable-next-line no-template-curly-in-string
      expect(syncConfig?.LambdaConflictHandler.name).toEqual('myFunctionName-${env}');
      expect(syncConfig?.LambdaConflictHandler.lambdaArn).toBeDefined();
    });

    test('generates arn reference if not provided for model-level config', () => {
      const resolverConfig: ResolverConfig = {
        models: {
          Todo: {
            ConflictDetection: 'NONE',
            ConflictHandler: ConflictHandlerType.LAMBDA,
            LambdaConflictHandler: {
              // eslint-disable-next-line no-template-curly-in-string
              name: 'myFunctionName-${env}',
            },
          },
        },
      };

      const syncConfig = getSyncConfig(createMockContext(resolverConfig), 'Todo') as SyncConfigLambda;

      expect(syncConfig).toBeDefined();
      expect(syncConfig?.ConflictHandler).toEqual(ConflictHandlerType.LAMBDA);
      // eslint-disable-next-line no-template-curly-in-string
      expect(syncConfig?.LambdaConflictHandler.name).toEqual('myFunctionName-${env}');
      expect(syncConfig?.LambdaConflictHandler.lambdaArn).toBeDefined();
    });
  });
});
