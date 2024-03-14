import {
  ModelDataSourceStrategySqlDbType,
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { setFieldMappingResolverReference } from '../resolvers';
import { BelongsToDirectiveConfiguration } from '../types';
import { ensureReferencesArray, getBelongsToReferencesNodes, validateChildReferencesFieldsHomogeneousSql } from '../utils';
import { getStrategyDbTypeFromTypeNode } from '@aws-amplify/graphql-transformer-core';
import { getGenerator } from '../resolver/generator-factory';

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
    validateChildReferencesFieldsHomogeneousSql(config, context as TransformerContextProvider);
  };

  /** no-op */
  generateResolvers = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    const generator = getGenerator(this.dbType);
    generator.makeBelongsToGetItemConnectionWithKeyResolver(config, context);
  };

  validate = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    config.fieldNodes = getBelongsToReferencesNodes(config, context);
  };
}
