import { MYSQL_DB_TYPE, POSTGRES_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { getGenerator } from '../resolver/generator-factory';
import { setFieldMappingResolverReference } from '../resolvers';
import { BelongsToDirectiveConfiguration } from '../types';
import { ensureReferencesArray, getBelongsToReferencesNodes, validateChildReferencesFields } from '../utils';

/**
 * BelongsToDirectiveSQLTransformer executes transformations based on `@belongsTo(references: [String!])` configurations
 * and surrounding TransformerContextProviders for SQL data sources.
 */
export class BelongsToDirectiveSQLTransformer implements DataSourceBasedDirectiveTransformer<BelongsToDirectiveConfiguration> {
  dbType = POSTGRES_DB_TYPE || MYSQL_DB_TYPE;

  prepare = (context: TransformerPrepareStepContextProvider, config: BelongsToDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value);
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: BelongsToDirectiveConfiguration): void => {
    validateChildReferencesFields(config, context as TransformerContextProvider);
  };

  generateResolvers = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    const generator = getGenerator(this.dbType);
    generator.makeBelongsToGetItemConnectionWithKeyResolver(config, context);
  };

  validate = (context: TransformerContextProvider, config: BelongsToDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    config.referenceNodes = getBelongsToReferencesNodes(config, context);
  };
}
