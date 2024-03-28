import { DDB_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { DDBRelationalReferencesResolverGenerator } from '../resolver/ddb-references-generator';
import { setFieldMappingResolverReference, updateTableForReferencesConnection } from '../resolvers';
import { HasManyDirectiveConfiguration } from '../types';
import { ensureReferencesArray, getReferencesNodes, registerHasManyForeignKeyMappings, validateParentReferencesFields } from '../utils';

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

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasManyDirectiveConfiguration): void => {
    validateParentReferencesFields(config, context as TransformerContextProvider);
  };

  generateResolvers = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    updateTableForReferencesConnection(config, context);
    new DDBRelationalReferencesResolverGenerator().makeHasManyGetItemsConnectionWithKeyResolver(config, context);
  };

  validate = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    config.referenceNodes = getReferencesNodes(config, context);
    // TODO: validate bidirectionality
  };
}
