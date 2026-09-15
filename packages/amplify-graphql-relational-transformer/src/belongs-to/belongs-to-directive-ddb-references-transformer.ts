import { DDB_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { DDBRelationalReferencesResolverGenerator } from '../resolver/ddb-references-generator';
import { setFieldMappingResolverReference } from '../resolvers';
import { BelongsToDirectiveConfiguration } from '../types';
import {
  ensureReferencesArray,
  getBelongsToReferencesNodes,
  registerHasOneForeignKeyMappings,
  validateChildReferencesFields,
  validateReferencesBidirectionality,
  validateReferencesRelationalFieldNullability,
} from '../utils';

/**
 * BelongsToDirectiveDDBReferencesTransformer executes transformations based on `@belongsTo(references: [String!])` configurations
 * and surrounding TransformerContextProviders for DynamoDB data sources.
 *
 * This should not be used for `@belongsTo(fields: [String!])` definitions.
 */
export class BelongsToDirectiveDDBReferencesTransformer implements DataSourceBasedDirectiveTransformer<BelongsToDirectiveConfiguration> {
  dbType = DDB_DB_TYPE;

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

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: BelongsToDirectiveConfiguration): void => {};

  generateResolvers = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    new DDBRelationalReferencesResolverGenerator().makeBelongsToGetItemConnectionWithKeyResolver(config, context);
  };

  /**
   * Validate that the {@link BelongsToDirectiveConfiguration} has the necessary values to to run through
   * the remainder of the {@link BelongsToTransformer} workflow.
   *
   * This function mutates `indexName`, `references`, and `referenceNodes` properties on {@link config}
   * @param context The {@link TransformerContextProvider} passed to the {@link BelongsToTransformer}'s `validate` function.
   * @param config The {@link BelongsToDirectiveConfiguration} passed to the {@link BelongsToTransformer}'s `validate` function.
   */
  validate = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    validateChildReferencesFields(config, context as TransformerContextProvider);
    validateReferencesRelationalFieldNullability(config);
    config.referenceNodes = getBelongsToReferencesNodes(config, context);
    validateReferencesBidirectionality(config);
  };
}
