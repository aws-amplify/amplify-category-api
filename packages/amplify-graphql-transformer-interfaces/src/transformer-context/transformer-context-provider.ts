import { DocumentNode } from 'graphql';
import { AppSyncAuthConfiguration, GraphQLAPIProvider } from '../graphql-api-provider';
import { ModelDataSourceDefinition } from '../model-data-source-definition';
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

export interface TransformerContextProvider {
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
  modelDataSourceDefinitions: Record<string, ModelDataSourceDefinition>;
}

export type TransformerBeforeStepContextProvider = Pick<
  TransformerContextProvider,
  | 'inputDocument'
  | 'modelDataSourceDefinitions'
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
  | 'modelDataSourceDefinitions'
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
  | 'modelDataSourceDefinitions'
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
