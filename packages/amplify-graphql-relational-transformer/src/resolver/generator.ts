import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToDirectiveConfiguration, HasManyDirectiveConfiguration, HasOneDirectiveConfiguration } from '../types';

export abstract class RelationalResolverGenerator {
  abstract makeHasManyGetItemsConnectionWithKeyResolver(
    config: HasManyDirectiveConfiguration,
    ctx: TransformerContextProvider,
    relatedFields: string[],
  ): void;

  abstract makeHasOneGetItemConnectionWithKeyResolver(
    config: HasOneDirectiveConfiguration | BelongsToDirectiveConfiguration,
    ctx: TransformerContextProvider,
  ): void;

  abstract makeBelongsToGetItemConnectionWithKeyResolver(config: HasOneDirectiveConfiguration, ctx: TransformerContextProvider): void;
}
