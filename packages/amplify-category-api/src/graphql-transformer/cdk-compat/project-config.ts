import { DataSourceStrategiesProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { TransformConfig } from 'graphql-transformer-core';

export type Template = {
  Parameters: Record<string, any>;
  Resources: Record<string, any>;
  Outputs: Record<string, any>;
  Conditions: Record<string, any>;
};

export interface TransformerProjectConfig extends DataSourceStrategiesProvider {
  schema: string;
  functions: Record<string, string>;
  pipelineFunctions: Record<string, string>;
  resolvers: Record<string, string>;
  stacks: Record<string, Template>;
  config: TransformConfig;
}
