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
  PrimaryKeyVTLGenerator,
} from "./vtl-generator";

export class DynamoDBPrimaryKeyVTLGenerator implements PrimaryKeyVTLGenerator {
  generate = (config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider, resolverMap: Map<TransformerResolverProvider, string>): void => {
    replaceDdbPrimaryKey(config, ctx);
    updateResolvers(config, ctx, resolverMap);
  };
};
