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
import { HasManyDirectiveConfiguration } from '../types';
import {
  ensureReferencesArray,
  getReferencesNodes,
  registerHasManyForeignKeyMappings,
  validateParentReferencesFields,
  validateReferencesBidirectionality,
  validateReferencesRelationalFieldNullability,
} from '../utils';

/**
 * HasManyDirectiveDDBReferencesTransformer executes transformations based on `@hasMany(references: [String!])` configurations
 * and surrounding TransformerContextProviders for DynamoDB data sources.
 *
 * This should not be used for `@hasMany(fields: [String!])` definitions.
 */
export class HasManyDirectiveDDBReferencesTransformer implements DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> {
  dbType = DDB_DB_TYPE;

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

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasManyDirectiveConfiguration): void => {};

  generateResolvers = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    updateTableForReferencesConnection(config, context);
    updateRelatedModelMutationResolversForCompositeSortKeys(config, context);
    new DDBRelationalReferencesResolverGenerator().makeHasManyGetItemsConnectionWithKeyResolver(config, context);
  };

  /**
   * Validate that the {@link HasManyDirectiveConfiguration} has the necessary values to to run through
   * the remainder of the {@link HasManyTransformer} workflow.
   *
   * This function mutates `indexName`, `references`, and `referenceNodes` properties on {@link config}
   * @param context The {@link TransformerContextProvider} passed to the {@link HasManyTransformer}'s `validate` function.
   * @param config The {@link HasManyDirectiveConfiguration} passed to the {@link HasManyTransformer}'s `validate` function.
   */
  validate = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
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
