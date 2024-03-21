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
      // If references are passed to the directive, we'll use the references relational
      // modeling approach.
      if (config.references?.length >= 1) {
        // Passing both references and fields is not supported.
        if (config.fields?.length > 0) {
          // TODO: Better error message
          throw new Error('Something went wrong >> cannot have both references and fields.');
        }
        return new HasManyDirectiveDDBReferencesTransformer(dbType);
      }
      // fields based relational modeling is the default because it supports implicit
      // field creation / doesn't require explicitly defining the fields in the directive.
      return new HasManyDirectiveDDBFieldsTransformer(dbType);
  }
};
