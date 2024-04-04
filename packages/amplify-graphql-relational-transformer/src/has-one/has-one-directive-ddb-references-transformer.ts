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
import { ensureReferencesArray, getReferencesNodes, registerHasOneForeignKeyMappings, validateParentReferencesFields } from '../utils';

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

  validate = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    if (config.indexName) {
      const mappedObjectName = context.resourceHelper.getModelNameMapping(config.object.name.value);
      throw new Error(
        `Invalid @${config.directiveName} directive on ${mappedObjectName}.${config.field.name.value} - indexName is not supported with DDB references.`,
      );
    }
    ensureReferencesArray(config);
    validateParentReferencesFields(config, context);
    const objectName = config.object.name.value;
    const fieldName = config.field.name.value;
    config.indexName = `gsi-${objectName}.${fieldName}`;
    config.referenceNodes = getReferencesNodes(config, context);
  };
}
