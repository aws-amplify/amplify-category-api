import {
  TransformerContextProvider,
  TransformerResolverProvider,
} from '@aws-amplify/graphql-transformer-interfaces';

import { IndexDirectiveConfiguration, PrimaryKeyDirectiveConfiguration } from '../../types';

/**
 *
 */
export interface IndexVTLGenerator {
  generatePrimaryKeyVTL: (
    config: PrimaryKeyDirectiveConfiguration,
    ctx: TransformerContextProvider,
    resolverMap: Map<TransformerResolverProvider, string>,
  ) => void;
  generateIndexQueryRequestTemplate: (
    config: IndexDirectiveConfiguration,
    ctx: TransformerContextProvider,
    tableName: string,
    operationName: string,
  ) => string;
}
