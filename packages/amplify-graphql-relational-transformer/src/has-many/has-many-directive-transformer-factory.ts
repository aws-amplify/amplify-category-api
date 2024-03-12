import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { HasManyDirectiveConfiguration } from '../types';
import { HasManyDirectiveDDBFieldsTransformer } from './has-many-directive-ddb-fields-transformer';
import { HasManyDirectiveDDBReferencesTransformer } from './has-many-directive-ddb-references-transformer';
import { HasManyDirectiveSQLTransformer } from './has-many-directive-sql-transformer';

export const getHasManyDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
  config: HasManyDirectiveConfiguration,
): DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
    case 'POSTGRES':
      return new HasManyDirectiveSQLTransformer(dbType);
    case 'DYNAMODB':
      // TODO: bifurcate and validate before getting to this stage.
      if (config.references !== undefined && config.references.length >= 1) {
        if (config.fields !== undefined && config.fields.length > 0) {
          throw new Error('Something went wrong >> cannot have both references and fields.');
        }
        return new HasManyDirectiveDDBReferencesTransformer(dbType);
      } else {
        return new HasManyDirectiveDDBFieldsTransformer(dbType);
      }
  }
};
