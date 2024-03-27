import { MYSQL_DB_TYPE, POSTGRES_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceBasedDirectiveTransformer } from '../data-source-based-directive-transformer';
import { setFieldMappingResolverReference } from '../resolvers';
import { HasOneDirectiveConfiguration } from '../types';
import { ensureReferencesArray, getReferencesNodes, validateParentReferencesFields } from '../utils';
import { getGenerator } from '../resolver/generator-factory';

/**
 * HasOneDirectiveSQLTransformer executes transformations based on `@hasOne(references: [String!])` configurations
 * and surrounding TransformerContextProviders for SQL data sources.
 */
export class HasOneDirectiveSQLTransformer implements DataSourceBasedDirectiveTransformer<HasOneDirectiveConfiguration> {
  dbType = POSTGRES_DB_TYPE || MYSQL_DB_TYPE;

  prepare = (context: TransformerPrepareStepContextProvider, config: HasOneDirectiveConfiguration): void => {
    const modelName = config.object.name.value;
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value, true);
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider, config: HasOneDirectiveConfiguration): void => {
    validateParentReferencesFields(config, context as TransformerContextProvider);
  };

  generateResolvers = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    const generator = getGenerator(this.dbType);
    generator.makeHasOneGetItemConnectionWithKeyResolver(config, context);
  };

  validate = (context: TransformerContextProvider, config: HasOneDirectiveConfiguration): void => {
    ensureReferencesArray(config);
    getReferencesNodes(config, context);
  };
}
