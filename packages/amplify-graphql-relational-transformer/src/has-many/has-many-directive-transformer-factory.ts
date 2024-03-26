import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { HasManyDirectiveConfiguration } from '../types';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { HasManyDirectiveDDBFieldsTransformer } from './has-many-directive-ddb-fields-transformer';
import { HasManyDirectiveSQLTransformer } from './has-many-directive-sql-transformer';

export const getHasManyDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
): DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
    case 'POSTGRES':
      return new HasManyDirectiveSQLTransformer(dbType);
    case 'DYNAMODB':
      return new HasManyDirectiveDDBFieldsTransformer(dbType);
  }
};
