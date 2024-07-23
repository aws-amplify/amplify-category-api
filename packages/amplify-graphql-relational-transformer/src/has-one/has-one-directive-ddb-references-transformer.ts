import { DDB_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { DDBRelationalReferencesResolverGenerator } from '../resolver/ddb-references-generator';
import {
  setFieldMappingResolverReference,
  updateRelatedModelMutationResolversForCompositeSortKeys,
  updateTableForReferencesConnection,
} from '../resolvers';
import { HasOneDirectiveConfiguration } from '../types';
import {
  ensureReferencesArray,
  getReferencesNodes,
  registerHasOneForeignKeyMappings,
  validateParentReferencesFields,
  validateReferencesBidirectionality,
  validateReferencesRelationalFieldNullability,
} from '../utils';

/**
 * HasOneDirectiveDDBFieldsTransformer executes transformations based on `@hasOne(references: [String!])` configurations
 * and surrounding TransformerContextProviders for DynamoDB data sources.
 *
 * This should not be used for `@hasOne(fields: [String!])` definitions.
 */
export class HasOneDirectiveDDBReferencesTransformer implements DataSourceBasedDirectiveTransformer<HasOneDirectiveConfiguration> {
  dbType = DDB_DB_TYPE;

  prepare = (context: TransformerPrepareStepContextProvider, config: HasOneDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value, true);
    registerHasOneForeignKeyMappings({
      transformParameters: context.transformParameters,
      resourceHelper: context.resourceHelper,
      thisTypeName: modelName,
      thisFieldName: config.field.name.value,
      relatedType: config.relatedType,
    });
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasOneDirectiveConfiguration): void => {};

  generateResolvers = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    updateTableForReferencesConnection(config, context);
    updateRelatedModelMutationResolversForCompositeSortKeys(config, context);
    new DDBRelationalReferencesResolverGenerator().makeHasOneGetItemConnectionWithKeyResolver(config, context);
  };

  /**
   * Validate that the {@link HasOneDirectiveConfiguration} has the necessary values to to run through
   * the remainder of the {@link HasOneTransformer} workflow.
   *
   * This function mutates `indexName`, `references`, and `referenceNodes` properties on {@link config}
   * @param context The {@link TransformerContextProvider} passed to the {@link HasOneTransformer}'s `validate` function.
   * @param config The {@link HasOneDirectiveConfiguration} passed to the {@link HasOneTransformer}'s `validate` function.
   */
  validate = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    validateParentReferencesFields(config, context);
    validateReferencesRelationalFieldNullability(config);
    if (!config.indexName) {
      const objectName = config.object.name.value;
      const fieldName = config.field.name.value;
      config.indexName = `gsi-${objectName}.${fieldName}`;
    }
    config.referenceNodes = getReferencesNodes(config, context);
    validateReferencesBidirectionality(config);
  };
}
