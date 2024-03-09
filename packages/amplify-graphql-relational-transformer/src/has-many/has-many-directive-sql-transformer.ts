import {
  ModelDataSourceStrategySqlDbType,
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { setFieldMappingResolverReference } from '../resolvers';
import { HasManyDirectiveConfiguration } from '../types';
import { validateParentReferencesFields, ensureReferencesArray, getReferencesNodes } from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';


/**
 * HasManyDirectiveSQLTransformer executes transformations based on `@hasMany(references: [String!])` configurations
 * and surrounding TransformerContextProviders for SQL data sources.
 */
export class HasManyDirectiveSQLTransformer implements DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> {
  dbType: ModelDataSourceStrategySqlDbType;
  constructor(dbType: ModelDataSourceStrategySqlDbType) {)
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: HasManyDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value, true);
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasManyDirectiveConfiguration): void => {
    validateParentReferencesFields(config, context as TransformerContextProvider);
  };

  /** no-op */
  generateResolvers = (_context: TransformerContextProvider, _config: HasManyDirectiveConfiguration): void => {
    return;
  };

  validate = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    getReferencesNodes(config, context);
  };
}
