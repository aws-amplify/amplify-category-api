import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { HasOneDirectiveConfiguration } from '../types';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { HasOneDirectiveDDBFieldsTransformer } from './has-one-directive-ddb-fields-transformer';
import { HasOneDirectiveSQLTransformer } from './has-one-directive-sql-transformer';

const hasOneDirectiveMySqlTransformer = new HasOneDirectiveSQLTransformer();
const hasOneDirectivePostgresTransformer = new HasOneDirectiveSQLTransformer();
const hasOneDirectiveDdbFieldsTransformer = new HasOneDirectiveDDBFieldsTransformer();

export const getHasOneDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
  // eslint-disable-next-line consistent-return
): DataSourceBasedDirectiveTransformer<HasOneDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
      return hasOneDirectiveMySqlTransformer;
    case 'POSTGRES':
      return hasOneDirectivePostgresTransformer;
    case 'DYNAMODB':
      return hasOneDirectiveDdbFieldsTransformer;
  }
};
