import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { HasOneDirectiveConfiguration } from '../types';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { HasOneDirectiveDDBFieldsTransformer } from './has-one-directive-ddb-fields-transformer';
import { HasOneDirectiveSQLTransformer } from './has-one-directive-sql-transformer';
import { HasOneDirectiveDDBReferencesTransformer } from './has-one-directive-ddb-references-transformer';

export const getHasOneDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
  config: HasOneDirectiveConfiguration,
): DataSourceBasedDirectiveTransformer<HasOneDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
    case 'POSTGRES':
      return new HasOneDirectiveSQLTransformer(dbType);
    case 'DYNAMODB':
      if (config.references !== undefined && config.references.length >= 1) {
        if (config.fields !== undefined && config.fields.length > 0) {
          throw new Error('Something went wrong >> cannot have both references and fields.');
        }
        return new HasOneDirectiveDDBReferencesTransformer(dbType);
      } else {
        return new HasOneDirectiveDDBFieldsTransformer(dbType);
      }
  }
};
