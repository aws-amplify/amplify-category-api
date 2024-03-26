import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { HasOneDirectiveConfiguration } from '../types';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { HasOneDirectiveDDBFieldsTransformer } from './has-one-directive-ddb-fields-transformer';
import { HasOneDirectiveSQLTransformer } from './has-one-directive-sql-transformer';

export const getHasOneDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
): DataSourceBasedDirectiveTransformer<HasOneDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
    case 'POSTGRES':
      return new HasOneDirectiveSQLTransformer(dbType);
    case 'DYNAMODB':
      return new HasOneDirectiveDDBFieldsTransformer(dbType);
  }
};
