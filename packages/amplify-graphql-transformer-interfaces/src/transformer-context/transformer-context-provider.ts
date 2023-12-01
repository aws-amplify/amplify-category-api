import { DocumentNode } from 'graphql';
import { AppSyncAuthConfiguration, GraphQLAPIProvider } from '../graphql-api-provider';
import { DataSourceStrategiesProvider, RDSLayerMappingProvider } from '../model-datasource';
import { TransformerDataSourceManagerProvider } from './transformer-datasource-provider';
import { TransformerProviderRegistry } from './transformer-provider-registry';
import { TransformerContextOutputProvider } from './transformer-context-output-provider';
import { StackManagerProvider } from './stack-manager-provider';
import { TransformerResourceHelperProvider } from './resource-resource-provider';
import { TransformParameters } from './transform-parameters';
import { TransformerResolversManagerProvider } from './transformer-resolver-provider';
import { SynthParameters } from './synth-parameters';

export interface TransformerContextMetadataProvider {
  set: <T>(key: string, value: T) => void;
  get: <T>(key: string) => T | undefined;
  has: (key: string) => boolean;
}

export type TransformerSecrets = { [key: string]: any };

export interface TransformerContextProvider extends DataSourceStrategiesProvider, RDSLayerMappingProvider {
  metadata: TransformerContextMetadataProvider;
  resolvers: TransformerResolversManagerProvider;
  dataSources: TransformerDataSourceManagerProvider;
  providerRegistry: TransformerProviderRegistry;

  inputDocument: DocumentNode;
  output: TransformerContextOutputProvider;
  stackManager: StackManagerProvider;
  api: GraphQLAPIProvider;
  resourceHelper: TransformerResourceHelperProvider;
  authConfig: AppSyncAuthConfiguration;
  transformParameters: TransformParameters;
  synthParameters: SynthParameters;

  isProjectUsingDataStore: () => boolean;
  getResolverConfig: <ResolverConfig>() => ResolverConfig | undefined;
}

export type TransformerBeforeStepContextProvider = Pick<
  TransformerContextProvider,
  | 'inputDocument'
  | 'dataSourceStrategies'
  | 'sqlDirectiveDataSourceStrategies'
  | 'transformParameters'
  | 'isProjectUsingDataStore'
  | 'getResolverConfig'
  | 'authConfig'
  | 'stackManager'
  | 'synthParameters'
>;

export type TransformerSchemaVisitStepContextProvider = Pick<
  TransformerContextProvider,
  | 'inputDocument'
  | 'dataSourceStrategies'
  | 'sqlDirectiveDataSourceStrategies'
  | 'output'
  | 'providerRegistry'
  | 'transformParameters'
  | 'isProjectUsingDataStore'
  | 'getResolverConfig'
  | 'metadata'
  | 'authConfig'
  | 'resourceHelper'
>;

export type TransformerValidationStepContextProvider = Pick<
  TransformerContextProvider,
  | 'inputDocument'
  | 'dataSourceStrategies'
  | 'sqlDirectiveDataSourceStrategies'
  | 'output'
  | 'providerRegistry'
  | 'dataSources'
  | 'transformParameters'
  | 'isProjectUsingDataStore'
  | 'getResolverConfig'
  | 'metadata'
  | 'authConfig'
  | 'resourceHelper'
  | 'resolvers'
  | 'stackManager'
  | 'synthParameters'
>;

export type TransformerPrepareStepContextProvider = TransformerValidationStepContextProvider;

export type TransformerTransformSchemaStepContextProvider = TransformerValidationStepContextProvider;
