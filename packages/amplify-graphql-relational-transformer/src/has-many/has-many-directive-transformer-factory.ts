import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { HasManyDirectiveConfiguration } from '../types';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { HasManyDirectiveDDBFieldsTransformer } from './has-many-directive-ddb-fields-transformer';
import { HasManyDirectiveSQLTransformer } from './has-many-directive-sql-transformer';
import { HasManyDirectiveDDBReferencesTransformer } from './has-many-directive-ddb-references-transformer';

export const getHasManyDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
  config: HasManyDirectiveConfiguration,
): DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
    case 'POSTGRES':
      return new HasManyDirectiveSQLTransformer(dbType);
    case 'DYNAMODB':
      if (config.references.length >= 1 && config.fields.length === 0) {
        return new HasManyDirectiveDDBReferencesTransformer(dbType);
      } else if (config.fields.length >= 1 && config.references.length === 0) {
        return new HasManyDirectiveDDBFieldsTransformer(dbType);
      } else {
        throw new Error(
          'Something went wrong >> cannot have both references and fields.'
        )
      }
  }
};
