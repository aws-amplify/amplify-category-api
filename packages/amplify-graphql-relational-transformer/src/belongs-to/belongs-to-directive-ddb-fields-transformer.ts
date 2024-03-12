import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { BelongsToDirectiveConfiguration } from '../types';
import { ensureFieldsArray, getFieldsNodes, getRelatedTypeIndex, registerHasOneForeignKeyMappings } from '../utils';

/**
 * BelongsToDirectiveDDBFieldsTransformer executes transformations based on `@belongsTo(fields: [String!])` configurations
 * and surrounding TransformerContextProviders for DynamoDB data sources.
 *
 * This should not be used for `@belongsTo(references: [String!])` definitions.
 */
export class BelongsToDirectiveDDBFieldsTransformer implements DataSourceBasedDirectiveTransformer<BelongsToDirectiveConfiguration> {
  dbType: 'DYNAMODB';
  constructor(dbType: 'DYNAMODB') {
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: BelongsToDirectiveConfiguration): void => {
    if (config.relationType !== 'hasOne') {
      return;
    }
    const modelName = config.object.name.value;
    registerHasOneForeignKeyMappings({
      transformParameters: context.transformParameters,
      resourceHelper: context.resourceHelper,
      thisTypeName: modelName,
      thisFieldName: config.field.name.value,
      relatedType: config.relatedType,
    });
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: BelongsToDirectiveConfiguration): void => {
    config.relatedTypeIndex = getRelatedTypeIndex(config, context as TransformerContextProvider);
  };

  /** no-op */
  generateResolvers = (_context: TransformerContextProvider, _config: BelongsToDirectiveConfiguration): void => {
    return;
  };

  validate = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    ensureFieldsArray(config);
    config.fieldNodes = getFieldsNodes(config, context);
  };
}
