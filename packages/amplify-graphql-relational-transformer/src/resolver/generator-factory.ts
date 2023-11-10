import { ModelDataSourceDbType, POSTGRES_DB_TYPE, MYSQL_DB_TYPE } from 'graphql-transformer-common';
import { RDSRelationalResolverGenerator } from './rds-generator';
import { DDBRelationalResolverGenerator } from './ddb-generator';
import { RelationalResolverGenerator } from './generator';

export const getGenerator = (dbType: ModelDataSourceDbType): RelationalResolverGenerator => {
  switch (dbType) {
    case POSTGRES_DB_TYPE:
      return new RDSRelationalResolverGenerator();
    case MYSQL_DB_TYPE:
      return new RDSRelationalResolverGenerator();
    default:
      return new DDBRelationalResolverGenerator();
  }
};
