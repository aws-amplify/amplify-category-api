<<<<<<< HEAD
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { updateTableForConnection } from '../resolvers';
import { HasManyDirectiveConfiguration } from '../types';
import { registerHasManyForeignKeyMappings, getRelatedTypeIndex, ensureFieldsArray, getFieldsNodes } from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';

/**
 * HasManyDirectiveDDBFieldsTransformer executes transformations based on `@hasMany(fields: [String!])` configurations
 * and surrounding TransformerContextProviders for DynamoDB data sources.
 *
 * This should not be used for `@hasMany(references: [String!])` definitions.
 */
=======
/* eslint-disable max-classes-per-file */
import {
    TransformerContextProvider,
    TransformerPrepareStepContextProvider,
    TransformerTransformSchemaStepContextProvider
} from '@aws-amplify/graphql-transformer-interfaces';
import { updateTableForConnection } from '../resolvers';
import { HasManyDirectiveConfiguration } from '../types';
import {
    registerHasManyForeignKeyMappings,
    getRelatedTypeIndex,
    ensureFieldsArray,
    getFieldsNodes,
} from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';

>>>>>>> 68e8f8efb (hasMany - split out datasource specific logic)
export class HasManyDirectiveDDBFieldsTransformer implements DataSourceBasedDirectiveTransformer<HasManyDirectiveConfiguration> {
  dbType: 'DYNAMODB';
  constructor(dbType: 'DYNAMODB') {
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: HasManyDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    registerHasManyForeignKeyMappings({
<<<<<<< HEAD
      transformParameters: context.transformParameters,
      resourceHelper: context.resourceHelper,
      thisTypeName: modelName,
      thisFieldName: config.field.name.value,
      relatedType: config.relatedType,
    });
=======
        transformParameters: context.transformParameters,
        resourceHelper: context.resourceHelper,
        thisTypeName: modelName,
        thisFieldName: config.field.name.value,
        relatedType: config.relatedType,
      });
>>>>>>> 68e8f8efb (hasMany - split out datasource specific logic)
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasManyDirectiveConfiguration): void => {
    config.relatedTypeIndex = getRelatedTypeIndex(config, context as TransformerContextProvider, config.indexName);
<<<<<<< HEAD
  };

  generateResolvers = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    updateTableForConnection(config, context);
  };
=======
};

  generateResolvers = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    updateTableForConnection(config, context);
};
>>>>>>> 68e8f8efb (hasMany - split out datasource specific logic)

  validate = (context: TransformerContextProvider, config: HasManyDirectiveConfiguration): void => {
    ensureFieldsArray(config);
    config.fieldNodes = getFieldsNodes(config, context);
  };
}
