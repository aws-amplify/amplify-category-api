import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  ModelDataSourceStrategyDbType,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToDirectiveConfiguration, HasManyDirectiveConfiguration, HasOneDirectiveConfiguration } from './types';
import { FieldDefinitionNode } from 'graphql';

export type RelationalDirectiveConfiguration =
  | HasOneDirectiveConfiguration
  | HasManyDirectiveConfiguration
  | BelongsToDirectiveConfiguration;

/**
 * Represents a subset of transformer methods based on a specific
 * data source (currently SQL / DDB Fields).
 *
 * Each method is to be invoked by the applicable relational transformer when iterating through
 * its directive configurations the applicable transformer step.
 */
export interface DataSourceBasedDirectiveTransformer<Config extends RelationalDirectiveConfiguration> {
  // Constrains the DataSourceBasedDirectiveTransformer to a specific database type
  dbType: ModelDataSourceStrategyDbType;
  prepare: (context: TransformerPrepareStepContextProvider, config: Config) => void;
  transformSchema: (context: TransformerTransformSchemaStepContextProvider, config: Config) => void;
  generateResolvers: (context: TransformerContextProvider, config: Config) => void;
  validate: (context: TransformerContextProvider, config: Config) => void;
}
