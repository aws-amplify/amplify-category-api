import { DocumentNode } from 'graphql';
import { AppSyncAuthConfiguration, GraphQLAPIProvider } from '../graphql-api-provider';
import { TransformerResolversManagerProvider } from './transformer-resolver-provider';
import { TransformerDataSourceManagerProvider, DatasourceType } from './transformer-datasource-provider';
import { TransformerProviderRegistry } from './transformer-provider-registry';
import { TransformerContextOutputProvider } from './transformer-context-output-provider';
import { StackManagerProvider } from './stack-manager-provider';
import { AppSyncAuthConfiguration, GraphQLAPIProvider, RDSLayerMapping, VpcConfig } from '../graphql-api-provider';
import { TransformerResourceHelperProvider } from './resource-resource-provider';
import { TransformParameters } from './transform-parameters';

export interface TransformerContextMetadataProvider {
  set<T>(key: string, value: T): void;
  get<T>(key: string): T | undefined;
  has(key: string): boolean;
}

export type TransformerSecrets = { [key: string]: any };

export interface TransformerContextProvider {
  metadata: TransformerContextMetadataProvider;
  resolvers: TransformerResolversManagerProvider;
  dataSources: TransformerDataSourceManagerProvider;
  providerRegistry: TransformerProviderRegistry;

  inputDocument: DocumentNode;
  modelToDatasourceMap: Map<string, DatasourceType>;
  datasourceSecretParameterLocations: Map<string, TransformerSecrets>;
  output: TransformerContextOutputProvider;
  stackManager: StackManagerProvider;
  api: GraphQLAPIProvider;
  resourceHelper: TransformerResourceHelperProvider;
  authConfig: AppSyncAuthConfiguration;
  transformParameters: TransformParameters;

  isProjectUsingDataStore(): boolean;
  getResolverConfig<ResolverConfig>(): ResolverConfig | undefined;
  readonly sqlLambdaVpcConfig?: VpcConfig;
  readonly rdsLayerMapping?: RDSLayerMapping;
}

export type TransformerBeforeStepContextProvider = Pick<
  TransformerContextProvider,
  | 'inputDocument'
  | 'modelToDatasourceMap'
  | 'transformParameters'
  | 'isProjectUsingDataStore'
  | 'getResolverConfig'
  | 'authConfig'
  | 'stackManager'
>;

export type TransformerSchemaVisitStepContextProvider = Pick<
  TransformerContextProvider,
  | 'inputDocument'
  | 'modelToDatasourceMap'
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
  | 'modelToDatasourceMap'
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
>;

export type TransformerPrepareStepContextProvider = TransformerValidationStepContextProvider;

export type TransformerTransformSchemaStepContextProvider = TransformerValidationStepContextProvider;
