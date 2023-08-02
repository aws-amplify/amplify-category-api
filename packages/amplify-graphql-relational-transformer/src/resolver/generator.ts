import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { HasManyDirectiveConfiguration } from '../types';

export interface RelationalResolverGenerator {
  makeQueryConnectionWithKeyResolver: (config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider) => void;
}
