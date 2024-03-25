import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { HasOneDirectiveConfiguration } from '../types';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { HasOneDirectiveDDBFieldsTransformer } from './has-one-directive-ddb-fields-transformer';
import { HasOneDirectiveSQLTransformer } from './has-one-directive-sql-transformer';
import { HasOneDirectiveDDBReferencesTransformer } from './has-one-directive-ddb-references-transformer';

const hasOneDirectiveMySqlTransformer = new HasOneDirectiveSQLTransformer();
const hasOneDirectivePostgresTransformer = new HasOneDirectiveSQLTransformer();
const hasOneDirectiveDdbFieldsTransformer = new HasOneDirectiveDDBFieldsTransformer();
const hasOneDirectiveDdbReferencesTransformer = new HasOneDirectiveDDBReferencesTransformer();

export const getHasOneDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
  config: HasOneDirectiveConfiguration,
  // eslint-disable-next-line consistent-return
): DataSourceBasedDirectiveTransformer<HasOneDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
      return hasOneDirectiveMySqlTransformer;
    case 'POSTGRES':
      return hasOneDirectivePostgresTransformer;
    case 'DYNAMODB':
      // If references are passed to the directive, we'll use the references relational
      // modeling approach.
      if (config.references) {
        // Passing both references and fields is not supported.
        if (config.fields) {
          // TODO: Better error message
          throw new Error('Something went wrong >> cannot have both references and fields.');
        }
        if (config.references.length < 1) {
          throw new Error(`Invalid @hasMany directive on ${config.field.name.value} - empty references list`);
        }
        return hasOneDirectiveDdbReferencesTransformer;
      }

      // fields based relational modeling is the default because it supports implicit
      // field creation / doesn't require explicitly defining the fields in the directive.
      return hasOneDirectiveDdbFieldsTransformer;
  }
};
