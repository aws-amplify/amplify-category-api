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
import { TransformerFactoryArgs } from '../graphql-transformer/transformer-options-types';

export const constructTransformerChain = (
  customTransformers: TransformerPluginProvider[],
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
    ...customTransformers,
  ];
};
