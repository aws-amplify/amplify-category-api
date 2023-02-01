import {
  TransformerContextProvider,
  TransformerResolverProvider
} from '@aws-amplify/graphql-transformer-interfaces';

import { PrimaryKeyDirectiveConfiguration } from '../../types';

export interface IndexVTLGenerator {
  generatePrimaryKeyVTL(config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider, resolverMap: Map<TransformerResolverProvider, string>): void;
};
