import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  ModelDataSourceStrategyDbType,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToDirectiveConfiguration, HasManyDirectiveConfiguration, HasOneDirectiveConfiguration } from './types';

export type DirectiveConfiguration = HasOneDirectiveConfiguration | HasManyDirectiveConfiguration | BelongsToDirectiveConfiguration;

/**
 * Represents a subset of transformer methods based on a specific
 * data source (currently SQL / DDB Fields).
*/
export interface DataSourceBasedDirectiveTransformer<Config extends DirectiveConfiguration> {
  dbType: ModelDataSourceStrategyDbType;
  prepare: (context: TransformerPrepareStepContextProvider, config: Config) => void;
  transformSchema: (context: TransformerTransformSchemaStepContextProvider, config: Config) => void;
  generateResolvers: (context: TransformerContextProvider, config: Config) => void;
  validate: (context: TransformerContextProvider, config: Config) => void;
}
