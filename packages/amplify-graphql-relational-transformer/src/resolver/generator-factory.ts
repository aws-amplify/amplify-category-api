import { MYSQL_DB_TYPE, POSTGRES_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { DDBRelationalResolverGenerator } from './ddb-generator';
import { RelationalResolverGenerator } from './generator';
import { RDSRelationalResolverGenerator } from './rds-generator';

export const getGenerator = (dbType: ModelDataSourceStrategyDbType): RelationalResolverGenerator => {
  switch (dbType) {
    case POSTGRES_DB_TYPE:
      return new RDSRelationalResolverGenerator();
    case MYSQL_DB_TYPE:
      return new RDSRelationalResolverGenerator();
    default:
      return new DDBRelationalResolverGenerator();
  }
};
