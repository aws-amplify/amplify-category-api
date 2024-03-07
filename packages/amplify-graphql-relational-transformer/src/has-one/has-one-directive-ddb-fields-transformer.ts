import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { HasOneDirectiveConfiguration } from '../types';
import { getRelatedTypeIndex, ensureFieldsArray, getFieldsNodes, registerHasOneForeignKeyMappings } from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';

export class HasOneDirectiveDDBFieldsTransformer implements DataSourceBasedDirectiveTransformer<HasOneDirectiveConfiguration> {
  dbType: 'DYNAMODB';
  constructor(dbType: 'DYNAMODB') {
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: HasOneDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    registerHasOneForeignKeyMappings({
      transformParameters: context.transformParameters,
      resourceHelper: context.resourceHelper,
      thisTypeName: modelName,
      thisFieldName: config.field.name.value,
      relatedType: config.relatedType,
    });
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasOneDirectiveConfiguration): void => {
    config.relatedTypeIndex = getRelatedTypeIndex(config, context as TransformerContextProvider);
  };

  generateResolvers = (_context: TransformerContextProvider, _config: HasOneDirectiveConfiguration): void => {
    return;
  };

  validate = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    ensureFieldsArray(config);
    config.fieldNodes = getFieldsNodes(config, context);
  };
}
