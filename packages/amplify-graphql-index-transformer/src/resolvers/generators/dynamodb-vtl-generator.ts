import {
  replaceDdbPrimaryKey,
  updateResolvers
} from '../resolvers';
import {
  TransformerContextProvider,
  TransformerResolverProvider
} from '@aws-amplify/graphql-transformer-interfaces';
import { PrimaryKeyDirectiveConfiguration } from '../../types';
import {
  IndexVTLGenerator,
} from "./vtl-generator";

export class DynamoDBIndexVTLGenerator implements IndexVTLGenerator {
  generatePrimaryKeyVTL = (config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider, resolverMap: Map<TransformerResolverProvider, string>): void => {
    replaceDdbPrimaryKey(config, ctx);
    updateResolvers(config, ctx, resolverMap);
  };
};
