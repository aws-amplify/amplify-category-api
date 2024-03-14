import {
    TransformerContextProvider,
    TransformerPrepareStepContextProvider,
    TransformerTransformSchemaStepContextProvider,
  } from '@aws-amplify/graphql-transformer-interfaces';
  import { HasOneDirectiveConfiguration } from '../types';
  import { getRelatedTypeIndex, ensureFieldsArray, getFieldsNodes, registerHasOneForeignKeyMappings, ensureReferencesArray, getReferencesNodes, validateParentReferencesFields } from '../utils';
  import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { setFieldMappingResolverReference, updateTableForReferencesConnection } from '../resolvers';
import { DDBRelationalReferencesResolverGenerator } from '../resolver/ddb-references-generator';

  /**
   * HasOneDirectiveDDBFieldsTransformer executes transformations based on `@hasOne(references: [String!])` configurations
   * and surrounding TransformerContextProviders for DynamoDB data sources.
   *
   * This should not be used for `@hasOne(fields: [String!])` definitions.
   */
  export class HasOneDirectiveDDBReferencesTransformer implements DataSourceBasedDirectiveTransformer<HasOneDirectiveConfiguration> {
    dbType: 'DYNAMODB';
    constructor(dbType: 'DYNAMODB') {
      this.dbType = dbType;
    }

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
        validateParentReferencesFields(config, context as TransformerContextProvider)
    };

    generateResolvers = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
      updateTableForReferencesConnection(config, context);
      new DDBRelationalReferencesResolverGenerator().makeHasOneGetItemConnectionWithKeyResolver(config, context);
    };

    validate = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
        ensureReferencesArray(config);
        config.fieldNodes = getReferencesNodes(config, context);
    };
  }
