/* eslint-disable max-classes-per-file, no-underscore-dangle */
import {
  GraphQLAPIProvider,
  StackManagerProvider,
  TransformerContextOutputProvider,
  TransformerContextProvider,
  TransformerDataSourceManagerProvider,
  AppSyncAuthConfiguration,
  RDSLayerMapping,
  SynthParameters,
} from '@aws-amplify/graphql-transformer-interfaces';
import type {
  AssetProvider,
  DataSourceType,
  NestedStackProvider,
  TransformParameterProvider,
  TransformParameters,
  VpcConfig,
  ProvisionedConcurrencyConfig,
} from '@aws-amplify/graphql-transformer-interfaces';
import { TransformerContextMetadataProvider } from '@aws-amplify/graphql-transformer-interfaces/src/transformer-context/transformer-context-provider';
import { DocumentNode } from 'graphql';
import { Construct } from 'constructs';
import { ResolverConfig } from '../config/transformer-config';
import { RDSConnectionSecrets } from '../types';
import { TransformerDataSourceManager } from './datasource';
import { TransformerOutput } from './output';
import { TransformerContextProviderRegistry } from './provider-registry';
import { ResolverManager } from './resolver';
import { TransformerResourceHelper } from './resource-helper';
import { StackManager } from './stack-manager';
import { assetManager } from './asset-manager';

export { TransformerResolver } from './resolver';
export { StackManager } from './stack-manager';
export class TransformerContextMetadata implements TransformerContextMetadataProvider {
  /**
   * Used by transformers to pass information between one another.
   */
  private metadata: { [key: string]: any } = new Map<string, any>();

  public get<T>(key: string): T | undefined {
    return this.metadata[key] as T;
  }

  public set<T>(key: string, val: T): void {
    this.metadata[key] = val;
  }

  public has(key: string): boolean {
    return this.metadata[key] !== undefined;
  }
}

export class TransformerContext implements TransformerContextProvider {
  public readonly output: TransformerContextOutputProvider;

  public readonly resolvers: ResolverManager;

  public readonly dataSources: TransformerDataSourceManagerProvider;

  public readonly providerRegistry: TransformerContextProviderRegistry;

  public readonly stackManager: StackManagerProvider;

  public readonly resourceHelper: TransformerResourceHelper;

  public readonly transformParameters: TransformParameters;

  public _api?: GraphQLAPIProvider;

  public readonly authConfig: AppSyncAuthConfiguration;

  private resolverConfig: ResolverConfig | undefined;

  public readonly modelToDatasourceMap: Map<string, DataSourceType>;

  public readonly datasourceSecretParameterLocations: Map<string, RDSConnectionSecrets>;

  public readonly sqlLambdaVpcConfig?: VpcConfig;

  public readonly rdsLayerMapping?: RDSLayerMapping;

  public readonly sqlLambdaProvisionedConcurrencyConfig?: ProvisionedConcurrencyConfig;

  public readonly customQueries: Map<string, string>;

  public metadata: TransformerContextMetadata;

  constructor(
    scope: Construct,
    nestedStackProvider: NestedStackProvider,
    parameterProvider: TransformParameterProvider | undefined,
    assetProvider: AssetProvider,
    public readonly synthParameters: SynthParameters,
    public readonly inputDocument: DocumentNode,
    modelToDatasourceMap: Map<string, DataSourceType>,
    customQueries: Map<string, string>,
    stackMapping: Record<string, string>,
    authConfig: AppSyncAuthConfiguration,
    transformParameters: TransformParameters,
    resolverConfig?: ResolverConfig,
    datasourceSecretParameterLocations?: Map<string, RDSConnectionSecrets>,
    sqlLambdaVpcConfig?: VpcConfig,
    rdsLayerMapping?: RDSLayerMapping,
    sqlLambdaProvisionedConcurrencyConfig?: ProvisionedConcurrencyConfig,
  ) {
    assetManager.setAssetProvider(assetProvider);
    this.output = new TransformerOutput(inputDocument);
    this.resolvers = new ResolverManager();
    this.dataSources = new TransformerDataSourceManager();
    this.providerRegistry = new TransformerContextProviderRegistry();
    this.stackManager = new StackManager(scope, nestedStackProvider, parameterProvider, stackMapping);
    this.authConfig = authConfig;
    this.resourceHelper = new TransformerResourceHelper(this.synthParameters);
    this.transformParameters = transformParameters;
    this.resolverConfig = resolverConfig;
    this.metadata = new TransformerContextMetadata();
    this.modelToDatasourceMap = modelToDatasourceMap;
    this.datasourceSecretParameterLocations = datasourceSecretParameterLocations ?? new Map<string, RDSConnectionSecrets>();
    this.sqlLambdaVpcConfig = sqlLambdaVpcConfig;
    this.rdsLayerMapping = rdsLayerMapping;
    this.sqlLambdaProvisionedConcurrencyConfig = sqlLambdaProvisionedConcurrencyConfig;
    this.customQueries = customQueries;
  }

  /**
   * Internal method to set the GraphQL API
   * @param api API instance available publicaly when the transformation starts
   * @internal
   */
  public bind(api: GraphQLAPIProvider): void {
    this._api = api;
    this.resourceHelper.bind(api);
  }

  public get api(): GraphQLAPIProvider {
    if (!this._api) {
      throw new Error('API is not initialized till generateResolver step');
    }
    return this._api!;
  }

  public getResolverConfig = <ResolverConfig>(): ResolverConfig | undefined => this.resolverConfig as ResolverConfig;

  public isProjectUsingDataStore(): boolean {
    return !!this.resolverConfig?.project || !!this.resolverConfig?.models;
  }
}
