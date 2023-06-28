import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { DefaultValueTransformer } from '@aws-amplify/graphql-default-value-transformer';
import { FunctionTransformer } from '@aws-amplify/graphql-function-transformer';
import { HttpTransformer } from '@aws-amplify/graphql-http-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { MapsToTransformer } from '@aws-amplify/graphql-maps-to-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { PredictionsTransformer } from '@aws-amplify/graphql-predictions-transformer';
import {
  BelongsToTransformer,
  HasManyTransformer,
  HasOneTransformer,
  ManyToManyTransformer,
} from '@aws-amplify/graphql-relational-transformer';
import { SearchableModelTransformer } from '@aws-amplify/graphql-searchable-transformer';
import {
  AppSyncAuthConfiguration,
  DeploymentResources,
  Template,
  TransformerPluginProvider,
  TransformerLog,
  TransformerLogLevel,
} from '@aws-amplify/graphql-transformer-interfaces';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces/src';
import {
  DatasourceType,
  GraphQLTransform,
  OverrideConfig,
  RDSConnectionSecrets,
  ResolverConfig,
  UserDefinedSlot,
} from '@aws-amplify/graphql-transformer-core';

/**
 * Arguments passed into a TransformerFactory
 * Used to determine how to create a new GraphQLTransform
 */
export type TransformerFactoryArgs = {
  authConfig?: any;
  storageConfig?: any;
  adminRoles?: Array<string>;
  identityPoolId?: string;
  customTransformers?: TransformerPluginProvider[];
};

/**
 * Transformer Options used to create a GraphQL Transform and compile a GQL API
 */
export type TransformConfig = {
  transformersFactoryArgs: TransformerFactoryArgs;
  resolverConfig?: ResolverConfig;
  authConfig?: AppSyncAuthConfiguration;
  stacks?: Record<string, Template>;
  overrideConfig?: OverrideConfig;
  userDefinedSlots?: Record<string, UserDefinedSlot[]>;
  stackMapping?: Record<string, string>;
  transformParameters: TransformParameters;
};

export const constructTransformerChain = (
  options?: TransformerFactoryArgs,
): TransformerPluginProvider[] => {
  const modelTransformer = new ModelTransformer();
  const authTransformer = new AuthTransformer({
    adminRoles: options?.adminRoles ?? [],
    identityPoolId: options?.identityPoolId,
  });
  const indexTransformer = new IndexTransformer();
  const hasOneTransformer = new HasOneTransformer();

  return [
    modelTransformer,
    new FunctionTransformer(),
    new HttpTransformer(),
    new PredictionsTransformer(options?.storageConfig),
    new PrimaryKeyTransformer(),
    indexTransformer,
    new HasManyTransformer(),
    hasOneTransformer,
    new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer),
    new BelongsToTransformer(),
    new DefaultValueTransformer(),
    authTransformer,
    new MapsToTransformer(),
    new SearchableModelTransformer(),
    ...(options?.customTransformers ?? []),
  ];
};

/**
 * Given a set of input config, construct a GraphQL transform to be executed.
 * @param config the config to provide for transformation.
 * @returns the GraphQLTransform object, which can be used for transformation or preprocessing a given schema.
 */
export const constructTransform = (config: TransformConfig): GraphQLTransform => {
  const {
    transformersFactoryArgs,
    authConfig,
    resolverConfig,
    overrideConfig,
    userDefinedSlots,
    stacks,
    stackMapping,
    transformParameters,
  } = config;

  const transformers = constructTransformerChain(transformersFactoryArgs);

  return new GraphQLTransform({
    transformers,
    stackMapping,
    authConfig,
    stacks,
    transformParameters,
    userDefinedSlots,
    resolverConfig,
    overrideConfig,
  });
};

export type ExecuteTransformConfig = TransformConfig & {
  schema: string;
  modelToDatasourceMap?: Map<string, DatasourceType>;
  datasourceSecretParameterLocations?: Map<string, RDSConnectionSecrets>;
  printTransformerLog?: (log: TransformerLog) => void;
};

/**
 * By default, rely on console to print out the transformer logs.
 * @param log the log to print.
 */
export const defaultPrintTransformerLog = (log: TransformerLog): void => {
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
};

/**
 * Construct a GraphQLTransform, and execute using the provided schema and optional datasource configuration.
 * @param config the configuration for the transform.
 * @returns the transformed api deployment resources.
 */
export const executeTransform = (config: ExecuteTransformConfig): DeploymentResources => {
  const {
    schema,
    modelToDatasourceMap,
    datasourceSecretParameterLocations,
    printTransformerLog,
  } = config;

  const printLog = printTransformerLog ?? defaultPrintTransformerLog;
  const transform = constructTransform(config);

  try {
    return transform.transform(schema, {
      modelToDatasourceMap,
      datasourceSecretParameterLocations,
    });
  } finally {
    transform.getLogs().forEach(printLog);
  }
};
