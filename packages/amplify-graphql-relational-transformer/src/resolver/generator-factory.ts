import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { DDBRelationalResolverGenerator } from './ddb-generator';
import { RelationalResolverGenerator } from './generator';

export const getGenerator = (_: ModelDataSourceStrategyDbType): RelationalResolverGenerator => {
  return new DDBRelationalResolverGenerator();
};
