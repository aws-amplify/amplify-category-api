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
  AppSyncAuthConfiguration, FeatureFlagProvider, Template, TransformerPluginProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  GraphQLTransform, OverrideConfig, ResolverConfig, UserDefinedSlot,
} from '@aws-amplify/graphql-transformer-core';

export type TransformerSearchConfig = {
  enableNodeToNodeEncryption?: boolean;
};

/**
 * Arguments passed into a TransformerFactory
 * Used to determine how to create a new GraphQLTransform
 */
export type TransformerFactoryArgs = {
  authConfig?: any;
  storageConfig?: any;
  adminRoles?: Array<string>;
  identityPoolId?: string;
  searchConfig?: TransformerSearchConfig;
  customTransformers?: TransformerPluginProvider[];
};

/**
 * Transformer Options used to create a GraphQL Transform and compile a GQL API
 */
export type TransformConfig = {
  legacyApiKeyEnabled?: number;
  disableResolverDeduping?: boolean;
  transformersFactoryArgs: TransformerFactoryArgs;
  resolverConfig?: ResolverConfig;
  authConfig?: AppSyncAuthConfiguration;
  stacks?: Record<string, Template>;
  sandboxModeEnabled?: boolean;
  overrideConfig?: OverrideConfig;
  userDefinedSlots?: Record<string, UserDefinedSlot[]>;
  stackMapping?: Record<string, string>;
  featureFlags: FeatureFlagProvider;
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
    new SearchableModelTransformer({ enableNodeToNodeEncryption: options?.searchConfig?.enableNodeToNodeEncryption }),
    ...(options?.customTransformers ?? []),
  ];
};

export const constructTransform = (config: TransformConfig): GraphQLTransform => {
  const {
    transformersFactoryArgs,
    authConfig,
    sandboxModeEnabled,
    resolverConfig,
    overrideConfig,
    userDefinedSlots,
    legacyApiKeyEnabled,
    disableResolverDeduping,
    stacks,
    stackMapping,
    featureFlags,
  } = config;

  const transformers = constructTransformerChain(transformersFactoryArgs);

  return new GraphQLTransform({
    transformers,
    stackMapping,
    authConfig,
    stacks,
    featureFlags,
    sandboxModeEnabled,
    userDefinedSlots,
    resolverConfig,
    overrideConfig,
    legacyApiKeyEnabled,
    disableResolverDeduping,
  });
};
