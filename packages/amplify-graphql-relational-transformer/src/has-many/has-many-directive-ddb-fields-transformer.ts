import { DDB_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { getGenerator } from '../resolver/generator-factory';
import { updateTableForConnection } from '../resolvers';
import { HasManyDirectiveConfiguration } from '../types';
import { ensureFieldsArray, getFieldsNodes, getRelatedTypeIndex, registerHasManyForeignKeyMappings } from '../utils';

/**
 * HasManyDirectiveDDBFieldsTransformer executes transformations based on `@hasMany(fields: [String!])` configurations
 * and surrounding TransformerContextProviders for DynamoDB data sources.
 *
 * This should not be used for `@hasMany(references: [String!])` definitions.
 */
export class HasManyDirectiveDDBFieldsTransformer implements DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> {
  dbType = DDB_DB_TYPE;

  prepare = (context: TransformerPrepareStepContextProvider, config: HasManyDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
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
  };

  generateResolvers = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    updateTableForConnection(config, context);
    const generator = getGenerator(this.dbType);
    generator.makeHasManyGetItemsConnectionWithKeyResolver(config, context);
  };

  validate = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    ensureFieldsArray(config);
    config.fieldNodes = getFieldsNodes(config, context);
  };
}
