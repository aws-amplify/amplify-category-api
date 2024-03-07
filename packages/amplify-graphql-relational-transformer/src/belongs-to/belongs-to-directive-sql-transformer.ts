import {
<<<<<<< HEAD
  ModelDataSourceStrategySqlDbType,
=======
>>>>>>> bdda07383 (belongsTo - split out datasource specific logic)
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { setFieldMappingResolverReference } from '../resolvers';
import { BelongsToDirectiveConfiguration } from '../types';
import { ensureReferencesArray, validateChildReferencesFields, getBelongsToReferencesNodes } from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';

/**
 * BelongsToDirectiveSQLTransformer executes transformations based on `@belongsTo(references: [String!])` configurations
 * and surrounding TransformerContextProviders for SQL data sources.
 */
export class BelongsToDirectiveSQLTransformer implements DataSourceBasedDirectiveTransformer<BelongsToDirectiveConfiguration> {
  dbType: ModelDataSourceStrategySqlDbType;
  constructor(dbType: ModelDataSourceStrategySqlDbType) {
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: BelongsToDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value);
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: BelongsToDirectiveConfiguration): void => {
    validateChildReferencesFields(config, context as TransformerContextProvider);
  };

<<<<<<< HEAD
  /** no-op */
  generateResolvers = (_context: TransformerContextProvider, _config: BelongsToDirectiveConfiguration): void => {
=======
  generateResolvers = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
>>>>>>> bdda07383 (belongsTo - split out datasource specific logic)
    return;
  };

  validate = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    getBelongsToReferencesNodes(config, context);
  };
}
