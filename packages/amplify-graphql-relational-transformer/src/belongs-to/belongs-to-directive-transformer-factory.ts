import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { BelongsToDirectiveConfiguration } from '../types';
import { BelongsToDirectiveDDBFieldsTransformer } from './belongs-to-directive-ddb-fields-transformer';
import { BelongsToDirectiveDDBReferencesTransformer } from './belongs-to-directive-ddb-references-transformer';
import { BelongsToDirectiveSQLTransformer } from './belongs-to-directive-sql-transformer';

const belongsToDirectiveMySqlTransformer = new BelongsToDirectiveSQLTransformer();
const belongsToDirectivePostgresTransformer = new BelongsToDirectiveSQLTransformer();
const belongsToDirectiveDdbFieldsTransformer = new BelongsToDirectiveDDBFieldsTransformer();
const belongsToDirectiveDdbReferencesTransformer = new BelongsToDirectiveDDBReferencesTransformer();

export const getBelongsToDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
  config: BelongsToDirectiveConfiguration,
  // eslint-disable-next-line consistent-return
): DataSourceBasedDirectiveTransformer<BelongsToDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
      return belongsToDirectiveMySqlTransformer;
    case 'POSTGRES':
      return belongsToDirectivePostgresTransformer;
    case 'DYNAMODB':
      // If references are passed to the directive, we'll use the references relational
      // modeling approach.
      if (config.references) {
        // Passing both references and fields is not supported.
        if (config.fields) {
          throw new InvalidDirectiveError(`fields and references cannot be defined in the same ${config.directiveName}. Use 'references'`);
        }
        if (config.references.length < 1) {
          throw new Error(`Invalid @belongsTo directive on ${config.field.name.value} - empty references list`);
        }

        return belongsToDirectiveDdbReferencesTransformer;
      }

      // fields based relational modeling is the default because it supports implicit
      // field creation / doesn't require explicitly defining the fields in the directive.
      return belongsToDirectiveDdbFieldsTransformer;
  }
};
