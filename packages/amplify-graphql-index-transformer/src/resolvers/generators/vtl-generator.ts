import {
  TransformerContextProvider,
  TransformerResolverProvider
} from '@aws-amplify/graphql-transformer-interfaces';

import { PrimaryKeyDirectiveConfiguration } from '../../types';

export interface PrimaryKeyVTLGenerator {
  generate(config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider, resolverMap: Map<TransformerResolverProvider, string>): void;
};
