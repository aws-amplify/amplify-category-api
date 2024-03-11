import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { setFieldMappingResolverReference, updateTableForConnection } from '../resolvers';
import { HasManyDirectiveConfiguration } from '../types';
import { registerHasManyForeignKeyMappings, validateParentReferencesFields, ensureReferencesArray, getReferencesNodes, getRelatedTypeIndex } from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { getGenerator } from '../resolver/generator-factory';

/**
 * HasManyDirectiveDDBReferencesTransformer executes transformations based on `@hasMany(references: [String!])` configurations
 * and surrounding TransformerContextProviders for DynamoDB data sources.
 *
 * This should not be used for `@hasMany(fields: [String!])` definitions.
 */
export class HasManyDirectiveDDBReferencesTransformer implements DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> {
  dbType: 'DYNAMODB';
  constructor(dbType: 'DYNAMODB') {
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: HasManyDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value, true);
    registerHasManyForeignKeyMappings({
      transformParameters: context.transformParameters,
      resourceHelper: context.resourceHelper,
      thisTypeName: modelName,
      thisFieldName: config.field.name.value,
      relatedType: config.relatedType,
    });
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasManyDirectiveConfiguration): void => {
    config.relatedTypeIndex = getRelatedTypeIndex(config, context as TransformerContextProvider, config.indexName);
    validateParentReferencesFields(config, context as TransformerContextProvider);
  };

  generateResolvers = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    updateTableForConnection(config, context, config.references);
    const generator = getGenerator(this.dbType);
    generator.makeHasManyGetItemsConnectionWithKeyResolver(config, context, config.references);
  };

  validate = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    getReferencesNodes(config, context);
  };
}
