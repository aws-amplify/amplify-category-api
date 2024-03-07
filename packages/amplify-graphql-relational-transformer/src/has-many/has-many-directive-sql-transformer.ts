import {
<<<<<<< HEAD
  ModelDataSourceStrategySqlDbType,
=======
>>>>>>> 68e8f8efb (hasMany - split out datasource specific logic)
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { setFieldMappingResolverReference } from '../resolvers';
import { HasManyDirectiveConfiguration } from '../types';
import { validateParentReferencesFields, ensureReferencesArray, getReferencesNodes } from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';

<<<<<<< HEAD
/**
 * HasManyDirectiveSQLTransformer executes transformations based on `@hasMany(references: [String!])` configurations
 * and surrounding TransformerContextProviders for SQL data sources.
 */
export class HasManyDirectiveSQLTransformer implements DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> {
  dbType: ModelDataSourceStrategySqlDbType;
  constructor(dbType: ModelDataSourceStrategySqlDbType) {
=======
export class HasManyDirectiveSQLTransformer implements DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> {
  dbType: 'MYSQL' | 'POSTGRES';
  constructor(dbType: 'MYSQL' | 'POSTGRES') {
>>>>>>> 68e8f8efb (hasMany - split out datasource specific logic)
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: HasManyDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value, true);
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasManyDirectiveConfiguration): void => {
    validateParentReferencesFields(config, context as TransformerContextProvider);
  };

<<<<<<< HEAD
  /** no-op */
  generateResolvers = (_context: TransformerContextProvider, _config: HasManyDirectiveConfiguration): void => {
=======
  generateResolvers = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
>>>>>>> 68e8f8efb (hasMany - split out datasource specific logic)
    return;
  };

  validate = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    getReferencesNodes(config, context);
  };
}
