import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { setFieldMappingResolverReference } from '../resolvers';
import { BelongsToDirectiveConfiguration } from '../types';
import { ensureReferencesArray, validateChildReferencesFields, getBelongsToReferencesNodes } from '../utils';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';

export class BelongsToDirectiveSQLTransformer implements DataSourceBasedDirectiveTransformer<BelongsToDirectiveConfiguration> {
  dbType: 'MYSQL' | 'POSTGRES';
  constructor(dbType: 'MYSQL' | 'POSTGRES') {
    this.dbType = dbType;
  }

  prepare = (context: TransformerPrepareStepContextProvider, config: BelongsToDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value);
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: BelongsToDirectiveConfiguration): void => {
    validateChildReferencesFields(config, context as TransformerContextProvider);
  };

  generateResolvers = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    return;
  };

  validate = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    getBelongsToReferencesNodes(config, context);
  };
}