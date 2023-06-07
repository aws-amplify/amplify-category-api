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
import { TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { GraphQLTransform, StackManager } from '@aws-amplify/graphql-transformer-core';
import { TransformerFactoryArgs, TransformerProjectOptions } from '../graphql-transformer/transformer-options-types';
import { AmplifyCLIFeatureFlagAdapter } from '../graphql-transformer/amplify-cli-feature-flag-adapter';
import { applyFileBasedOverride } from '../graphql-transformer/override';
import { parseUserDefinedSlotsFromProject } from '../graphql-transformer/user-defined-slots';

export const constructTransformerChain = (
  options: TransformerFactoryArgs,
): TransformerPluginProvider[] => {
  const modelTransformer = new ModelTransformer();
  const authTransformer = new AuthTransformer({
    adminRoles: options.adminRoles ?? [],
    identityPoolId: options.identityPoolId,
  });
  const indexTransformer = new IndexTransformer();
  const hasOneTransformer = new HasOneTransformer();

  const customTransformers = options.customTransformers ?? [];

  return [
    modelTransformer,
    new FunctionTransformer(),
    new HttpTransformer(),
    new PredictionsTransformer(options.storageConfig),
    new PrimaryKeyTransformer(),
    indexTransformer,
    new HasManyTransformer(),
    hasOneTransformer,
    new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer),
    new BelongsToTransformer(),
    new DefaultValueTransformer(),
    authTransformer,
    new MapsToTransformer(),
    new SearchableModelTransformer({ enableNodeToNodeEncryption: options.searchConfig?.enableNodeToNodeEncryption }),
    ...customTransformers,
  ];
};

export const constructTransform = (opts: TransformerProjectOptions): GraphQLTransform => new GraphQLTransform({
  transformers: constructTransformerChain(opts.transformersFactoryArgs),
  stackMapping: opts.projectConfig.config.StackMapping,
  transformConfig: opts.projectConfig.config,
  authConfig: opts.authConfig,
  buildParameters: opts.buildParameters,
  stacks: opts.projectConfig.stacks || {},
  featureFlags: new AmplifyCLIFeatureFlagAdapter(),
  sandboxModeEnabled: opts.sandboxModeEnabled,
  userDefinedSlots: parseUserDefinedSlotsFromProject(opts.projectConfig),
  resolverConfig: opts.resolverConfig,
  overrideConfig: {
    applyOverride: (stackManager: StackManager) => applyFileBasedOverride(stackManager),
    ...opts.overrideConfig,
  },
});
