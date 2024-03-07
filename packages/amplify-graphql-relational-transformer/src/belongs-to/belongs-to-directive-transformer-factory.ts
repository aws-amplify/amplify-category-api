import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToDirectiveConfiguration } from '../types';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { BelongsToDirectiveSQLTransformer } from './belongs-to-directive-sql-transformer';
import { BelongsToDirectiveDDBFieldsTransformer } from './belongs-to-directive-ddb-fields-transformer';

export const getBelongsToDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
): DataSourceBasedDirectiveTransformer<BelongsToDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
    case 'POSTGRES':
      return new BelongsToDirectiveSQLTransformer(dbType);
    case 'DYNAMODB':
      return new BelongsToDirectiveDDBFieldsTransformer(dbType);
  }
};
