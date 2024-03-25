import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToDirectiveConfiguration, HasManyDirectiveConfiguration, HasOneDirectiveConfiguration } from '../types';

export abstract class RelationalResolverGenerator {
  abstract makeHasManyGetItemsConnectionWithKeyResolver(config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider): void;
  abstract makeHasOneGetItemConnectionWithKeyResolver(config: HasOneDirectiveConfiguration, ctx: TransformerContextProvider): void;
  abstract makeBelongsToGetItemConnectionWithKeyResolver(config: BelongsToDirectiveConfiguration, ctx: TransformerContextProvider): void;
}
