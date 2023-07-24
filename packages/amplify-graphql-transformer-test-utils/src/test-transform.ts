import { AppSyncAuthConfiguration, TransformerPluginProvider, TransformerLogLevel } from '@aws-amplify/graphql-transformer-interfaces';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import {
  DatasourceType,
  GraphQLTransform,
  RDSConnectionSecrets,
  ResolverConfig,
  UserDefinedSlot,
} from '@aws-amplify/graphql-transformer-core';
import { OverrideConfig, TransformManager } from './cdk-compat/transform-manager';
import { DeploymentResources, Template } from './deployment-resources';

export type TestTransformParameters = {
  transformers: TransformerPluginProvider[];
  schema: string;
  transformParameters?: Partial<TransformParameters>;
  resolverConfig?: ResolverConfig;
  authConfig?: AppSyncAuthConfiguration;
  stacks?: Record<string, Template>;
  userDefinedSlots?: Record<string, UserDefinedSlot[]>;
  stackMapping?: Record<string, string>;
  modelToDatasourceMap?: Map<string, DatasourceType>;
  datasourceSecretParameterLocations?: Map<string, RDSConnectionSecrets>;
  overrideConfig?: OverrideConfig;
};

/**
 * This mirrors the old behavior of the graphql transformer, where we fully synthesize internally, for the purposes of
 * unit testing, and to introduce fewer changes during the refactor.
 */
export const testTransform = (params: TestTransformParameters): DeploymentResources => {
  const {
    schema,
    modelToDatasourceMap,
    datasourceSecretParameterLocations,
    overrideConfig,
    transformers,
    authConfig,
    resolverConfig,
    userDefinedSlots,
    stacks,
    stackMapping,
    transformParameters,
  } = params;

  const transform = new GraphQLTransform({
    transformers,
    stackMapping,
    authConfig,
    stacks,
    transformParameters,
    userDefinedSlots,
    resolverConfig,
  });

  const transformManager = new TransformManager(overrideConfig);

  try {
    transform.transform({
      scope: transformManager.getTransformScope(),
      nestedStackProvider: transformManager.getNestedStackProvider(),
      assetProvider: transformManager.getAssetProvider(),
      schema,
      datasourceConfig: {
        modelToDatasourceMap,
        datasourceSecretParameterLocations,
      },
    });

    return transformManager.generateDeploymentResources();
  } finally {
    transform.getLogs().forEach((log) => {
      switch (log.level) {
        case TransformerLogLevel.ERROR:
          console.error(log.message);
          break;
        case TransformerLogLevel.WARN:
          console.warn(log.message);
          break;
        case TransformerLogLevel.INFO:
          console.info(log.message);
          break;
        case TransformerLogLevel.DEBUG:
          console.debug(log.message);
          break;
        default:
          console.error(log.message);
      }
    });
  }
};
