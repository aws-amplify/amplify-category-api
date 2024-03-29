import { DDB_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { DDBRelationalReferencesResolverGenerator } from '../resolver/ddb-references-generator';
import { setFieldMappingResolverReference, updateTableForReferencesConnection } from '../resolvers';
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

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasOneDirectiveConfiguration): void => {
    validateParentReferencesFields(config, context as TransformerContextProvider);
  };

  generateResolvers = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    updateTableForReferencesConnection(config, context);
    new DDBRelationalReferencesResolverGenerator().makeHasOneGetItemConnectionWithKeyResolver(config, context);
  };

  validate = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    config.referenceNodes = getReferencesNodes(config, context);
  };
}
