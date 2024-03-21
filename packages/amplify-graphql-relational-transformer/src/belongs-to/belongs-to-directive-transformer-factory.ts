import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToDirectiveConfiguration } from '../types';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { BelongsToDirectiveSQLTransformer } from './belongs-to-directive-sql-transformer';
import { BelongsToDirectiveDDBFieldsTransformer } from './belongs-to-directive-ddb-fields-transformer';
import { BelongsToDirectiveDDBReferencesTransformer } from './belongs-to-directive-ddb-references-transformer';

export const getBelongsToDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
  config: BelongsToDirectiveConfiguration,
// eslint-disable-next-line consistent-return
): DataSourceBasedDirectiveTransformer<BelongsToDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
    case 'POSTGRES':
      return new BelongsToDirectiveSQLTransformer(dbType);
    case 'DYNAMODB':
      // If `references` are passed to the directive, we'll use the references relational
      // modeling approach.
      if (config.references?.length >= 1) {
        // Passing both `references` and `fields` is not supported.
        if (config.fields?.length > 0) {
          // TODO: Better error message
          throw new Error('Something went wrong >> cannot have both references and fields.');
        }
        return new BelongsToDirectiveDDBReferencesTransformer(dbType);
      }
      // `fields` based relational modeling is the default because it supports implicit
      // field creation / doesn't require explicitly defining the `fields` in the directive.
      return new BelongsToDirectiveDDBFieldsTransformer(dbType);
  }
};
