import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { DefaultValueTransformer } from '@aws-amplify/graphql-default-value-transformer';
import { FunctionTransformer } from '@aws-amplify/graphql-function-transformer';
import { HttpTransformer } from '@aws-amplify/graphql-http-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { MapsToTransformer, RefersToTransformer } from '@aws-amplify/graphql-maps-to-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { SqlTransformer } from '@aws-amplify/graphql-sql-transformer';
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
  TransformerPluginProvider,
  TransformerLog,
  TransformerLogLevel,
  NestedStackProvider,
  AssetProvider,
  SynthParameters,
  TransformParameterProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import type {
  DataSourceStrategiesProvider,
  RDSLayerMappingProvider,
  RDSSNSTopicMappingProvider,
  TransformParameters,
} from '@aws-amplify/graphql-transformer-interfaces';
import { GraphQLTransform, ResolverConfig, UserDefinedSlot } from '@aws-amplify/graphql-transformer-core';
import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

/**
 * Arguments passed into a TransformerFactory
 * Used to determine how to create a new GraphQLTransform
 */
export type TransformerFactoryArgs = {
  storageConfig?: any;
  customTransformers?: TransformerPluginProvider[];
  functionNameMap?: Record<string, IFunction>;
  allowGen1Patterns?: boolean;
};

/**
 * Transformer Options used to create a GraphQL Transform and compile a GQL API
 */
export type TransformConfig = {
  transformersFactoryArgs: TransformerFactoryArgs;
  resolverConfig?: ResolverConfig;
  authConfig?: AppSyncAuthConfiguration;
  userDefinedSlots?: Record<string, UserDefinedSlot[]>;
  stackMapping?: Record<string, string>;
  transformParameters: TransformParameters;
};

export const constructTransformerChain = (options?: TransformerFactoryArgs): TransformerPluginProvider[] => {
  const modelTransformer = new ModelTransformer();
  const authTransformer = new AuthTransformer();
  const indexTransformer = new IndexTransformer();
  const hasOneTransformer = new HasOneTransformer();

  const allowGen1Patterns = options?.allowGen1Patterns === undefined ? true : options?.allowGen1Patterns;

  // The default list of transformers should match DefaultDirectives in packages/amplify-graphql-directives/src/index.ts
  return [
    modelTransformer,
    new FunctionTransformer(options?.functionNameMap),
    new HttpTransformer(),
    ...(allowGen1Patterns ? [new PredictionsTransformer(options?.storageConfig)] : []),
    new PrimaryKeyTransformer(),
    indexTransformer,
    new HasManyTransformer(),
    hasOneTransformer,
    ...(allowGen1Patterns ? [new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer)] : []),
    new BelongsToTransformer(),
    new DefaultValueTransformer(),
    authTransformer,
    new MapsToTransformer(),
    new SqlTransformer(),
    new RefersToTransformer(),
    ...(allowGen1Patterns ? [new SearchableModelTransformer()] : []),
    ...(options?.customTransformers ?? []),
  ];
};

/**
 * Given a set of input config, construct a GraphQL transform to be executed.
 * @param config the config to provide for transformation.
 * @returns the GraphQLTransform object, which can be used for transformation or preprocessing a given schema.
 */
export const constructTransform = (config: TransformConfig): GraphQLTransform => {
  const { transformersFactoryArgs, authConfig, resolverConfig, userDefinedSlots, stackMapping, transformParameters } = config;

  const transformers = constructTransformerChain(transformersFactoryArgs);

  return new GraphQLTransform({
    transformers,
    stackMapping,
    authConfig,
    transformParameters,
    userDefinedSlots,
    resolverConfig,
  });
};

export type ExecuteTransformConfig = TransformConfig &
  DataSourceStrategiesProvider &
  RDSLayerMappingProvider &
  RDSSNSTopicMappingProvider & {
    schema: string;
    printTransformerLog?: (log: TransformerLog) => void;
    scope: Construct;
    nestedStackProvider: NestedStackProvider;
    parameterProvider?: TransformParameterProvider;
    assetProvider: AssetProvider;
    synthParameters: SynthParameters;
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
export const executeTransform = (config: ExecuteTransformConfig): void => {
  const {
    assetProvider,
    dataSourceStrategies,
    nestedStackProvider,
    parameterProvider,
    printTransformerLog,
    rdsLayerMapping,
    rdsSnsTopicMapping,
    schema,
    scope,
    sqlDirectiveDataSourceStrategies,
    synthParameters,
  } = config;

  const printLog = printTransformerLog ?? defaultPrintTransformerLog;
  const transform = constructTransform(config);
  try {
    transform.transform({
      assetProvider,
      dataSourceStrategies,
      nestedStackProvider,
      parameterProvider,
      rdsLayerMapping,
      rdsSnsTopicMapping,
      schema,
      scope,
      sqlDirectiveDataSourceStrategies,
      synthParameters,
    });
  } finally {
    transform.getLogs().forEach(printLog);
  }
};
