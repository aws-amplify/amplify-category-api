import { DBType, MYSQL_DB_TYPE, POSTGRES_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import { RDSRelationalResolverGenerator } from './rds-generator';
import { DDBRelationalResolverGenerator } from './ddb-generator';
import { RelationalResolverGenerator } from './generator';

export const getGenerator = (dbType: DBType): RelationalResolverGenerator => {
  switch (dbType) {
    case POSTGRES_DB_TYPE:
      return new RDSRelationalResolverGenerator();
    case MYSQL_DB_TYPE:
      return new RDSRelationalResolverGenerator();
    default:
      return new DDBRelationalResolverGenerator();
  }
};
