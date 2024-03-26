import {
  ModelDataSourceStrategySqlDbType,
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { setFieldMappingResolverReference } from '../resolvers';
import { HasOneDirectiveConfiguration } from '../types';
import { validateParentReferencesFields, ensureReferencesArray, getReferencesNodes } from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';

/**
 * HasOneDirectiveSQLTransformer executes transformations based on `@hasOne(references: [String!])` configurations
 * and surrounding TransformerContextProviders for SQL data sources.
 */
export class HasOneDirectiveSQLTransformer implements DataSourceBasedDirectiveTransformer<HasOneDirectiveConfiguration> {
  dbType: ModelDataSourceStrategySqlDbType;
  constructor(dbType: ModelDataSourceStrategySqlDbType) {
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: HasOneDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value, true);
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasOneDirectiveConfiguration): void => {
    validateParentReferencesFields(config, context as TransformerContextProvider);
  };

  /** no-op */
  generateResolvers = (_context: TransformerContextProvider, _config: HasOneDirectiveConfiguration): void => {
    return;
  };

  validate = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    getReferencesNodes(config, context);
  };
}
