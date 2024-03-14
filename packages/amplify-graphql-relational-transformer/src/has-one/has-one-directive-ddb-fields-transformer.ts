import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { HasOneDirectiveConfiguration } from '../types';
import { getRelatedTypeIndex, ensureFieldsArray, getFieldsNodes, registerHasOneForeignKeyMappings } from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { getGenerator } from '../resolver/generator-factory';

/**
 * HasOneDirectiveDDBFieldsTransformer executes transformations based on `@hasOne(fields: [String!])` configurations
 * and surrounding TransformerContextProviders for DynamoDB data sources.
 *
 * This should not be used for `@hasOne(references: [String!])` definitions.
 */
export class HasOneDirectiveDDBFieldsTransformer implements DataSourceBasedDirectiveTransformer<HasOneDirectiveConfiguration> {
  dbType: 'DYNAMODB';
  constructor(dbType: 'DYNAMODB') {
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: HasOneDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    registerHasOneForeignKeyMappings({
      transformParameters: context.transformParameters,
      resourceHelper: context.resourceHelper,
      thisTypeName: modelName,
      thisFieldName: config.field.name.value,
      relatedType: config.relatedType,
    });
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasOneDirectiveConfiguration): void => {
    config.relatedTypeIndex = getRelatedTypeIndex(config, context as TransformerContextProvider);
  };

  generateResolvers = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    const generator = getGenerator(this.dbType);
    generator.makeHasOneGetItemConnectionWithKeyResolver(config, context);
  };

  validate = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    ensureFieldsArray(config);
    config.fieldNodes = getFieldsNodes(config, context);
  };
}
