import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { HasManyDirectiveConfiguration } from '../types';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { HasManyDirectiveDDBFieldsTransformer } from './has-many-directive-ddb-fields-transformer';
import { HasManyDirectiveSQLTransformer } from './has-many-directive-sql-transformer';
import { HasManyDirectiveDDBReferencesTransformer } from './has-many-directive-ddb-references-transformer';

const hasManyDirectiveMySqlTransformer = new HasManyDirectiveSQLTransformer();
const hasManyDirectivePostgresTransformer = new HasManyDirectiveSQLTransformer();
const hasManyDirectiveDdbFieldsTransformer = new HasManyDirectiveDDBFieldsTransformer();
const hasManyDirectiveDdbReferencesTransformer = new HasManyDirectiveDDBReferencesTransformer();

export const getHasManyDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
  config: HasManyDirectiveConfiguration,
  // eslint-disable-next-line consistent-return
): DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
      return hasManyDirectiveMySqlTransformer;
    case 'POSTGRES':
      return hasManyDirectivePostgresTransformer;
    case 'DYNAMODB':
      // If references are passed to the directive, we'll use the references relational
      // modeling approach.
      if (config.references?.length >= 1) {
        // Passing both references and fields is not supported.
        if (config.fields?.length > 0) {
          // TODO: Better error message
          throw new Error('Something went wrong >> cannot have both references and fields.');
        }
        return hasManyDirectiveDdbReferencesTransformer;
      }
      // fields based relational modeling is the default because it supports implicit
      // field creation / doesn't require explicitly defining the fields in the directive.
      return hasManyDirectiveDdbFieldsTransformer;
  }
};
