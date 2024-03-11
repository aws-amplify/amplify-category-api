import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToDirectiveConfiguration } from '../types';
import {
  ensureReferencesArray,
  getBelongsToReferencesNodes,
  getRelatedTypeIndex,
  registerHasOneForeignKeyMappings,
  validateChildReferencesFields,
} from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { setFieldMappingResolverReference } from '../resolvers';

/**
 * BelongsToDirectiveDDBReferencesTransformer executes transformations based on `@belongsTo(references: [String!])` configurations
 * and surrounding TransformerContextProviders for DynamoDB data sources.
 *
 * This should not be used for `@belongsTo(fields: [String!])` definitions.
 */
export class BelongsToDirectiveDDBReferencesTransformer implements DataSourceBasedDirectiveTransformer<BelongsToDirectiveConfiguration> {
  dbType: 'DYNAMODB';
  constructor(dbType: 'DYNAMODB') {
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: BelongsToDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value);
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
    validateChildReferencesFields(config, context as TransformerContextProvider);
  };

  /** no-op */
  generateResolvers = (_context: TransformerContextProvider, _config: BelongsToDirectiveConfiguration): void => {
    return;
  };

  validate = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    getBelongsToReferencesNodes(config, context);
  };
}
