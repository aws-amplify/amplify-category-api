import { ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToDirectiveConfiguration } from '../types';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { BelongsToDirectiveSQLTransformer } from './belongs-to-directive-sql-transformer';
import { BelongsToDirectiveDDBFieldsTransformer } from './belongs-to-directive-ddb-fields-transformer';
import { BelongsToDirectiveDDBReferencesTransformer } from './belongs-to-directive-ddb-references-transformer';

export const getBelongsToDirectiveTransformer = (
  dbType: ModelDataSourceStrategyDbType,
  config: BelongsToDirectiveConfiguration,
): DataSourceBasedDirectiveTransformer<BelongsToDirectiveConfiguration> => {
  switch (dbType) {
    case 'MYSQL':
    case 'POSTGRES':
      return new BelongsToDirectiveSQLTransformer(dbType);
    case 'DYNAMODB':
      // TODO: bifurcate and validate before getting to this stage.
      if (config.references !== undefined && config.references.length >= 1) {
        if (config.fields !== undefined && config.fields.length > 0) {
          throw new Error(
            'Something went wrong >> cannot have both references and fields.'
          )
        }
        return new BelongsToDirectiveDDBReferencesTransformer(dbType);
      } else if (config.fields !== undefined && config.fields.length >= 1) {
        return new BelongsToDirectiveDDBFieldsTransformer(dbType);
      } else {
        throw new Error(
          'Something went wrong >> cannot have both references and fields.'
        )
      }
  }
};
