import { getPrimaryKeyFields } from '@aws-amplify/graphql-transformer-core';
import {
  ModelDataSourceStrategySqlDbType,
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { getGenerator } from '../resolver/generator-factory';
import { setFieldMappingResolverReference } from '../resolvers';
import { HasManyDirectiveConfiguration } from '../types';
import { ensureReferencesArray, getReferencesNodes, validateParentReferencesFieldsHomogeneousSql } from '../utils';

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
    validateParentReferencesFieldsHomogeneousSql(config, context as TransformerContextProvider);
  };

  generateResolvers = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    const generator = getGenerator(this.dbType);
    generator.makeHasManyGetItemsConnectionWithKeyResolver(config, context, config.references, getPrimaryKeyFields(config.object));
  };

  validate = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    getReferencesNodes(config, context);
  };
}
