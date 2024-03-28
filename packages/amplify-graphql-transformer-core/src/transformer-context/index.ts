/* eslint-disable max-classes-per-file, no-underscore-dangle */
import {
  AppSyncAuthConfiguration,
  AssetProvider,
  SqlDirectiveDataSourceStrategy,
  DataSourceStrategiesProvider,
  GraphQLAPIProvider,
  ModelDataSourceStrategy,
  NestedStackProvider,
  RDSLayerMapping,
  RDSLayerMappingProvider,
  RDSSNSTopicMappingProvider,
  StackManagerProvider,
  SynthParameters,
  TransformerContextMetadataProvider,
  TransformerContextOutputProvider,
  TransformerContextProvider,
  TransformerDataSourceManagerProvider,
  TransformParameterProvider,
  TransformParameters,
  RDSSNSTopicMapping,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DocumentNode } from 'graphql';
import { Construct } from 'constructs';
import { ResolverConfig } from '../config/transformer-config';
import { TransformerDataSourceManager } from './datasource';
import { TransformerOutput } from './output';
import { TransformerContextProviderRegistry } from './provider-registry';
import { ResolverManager } from './resolver';
import { TransformerResourceHelper } from './resource-helper';
import { StackManager } from './stack-manager';
import { assetManager, AssetManager } from './asset-manager';

export { TransformerResolver, NONE_DATA_SOURCE_NAME } from './resolver';
export { StackManager } from './stack-manager';
export { AssetManager } from './asset-manager';
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

export interface TransformerContextConstructorOptions
  extends DataSourceStrategiesProvider,
    RDSLayerMappingProvider,
    RDSSNSTopicMappingProvider {
  assetProvider: AssetProvider;
  authConfig: AppSyncAuthConfiguration;
  inputDocument: DocumentNode;
  nestedStackProvider: NestedStackProvider;
  parameterProvider: TransformParameterProvider | undefined;
  resolverConfig?: ResolverConfig;
  scope: Construct;
  stackMapping: Record<string, string>;
  synthParameters: SynthParameters;
  transformParameters: TransformParameters;
}

export class TransformerContext implements TransformerContextProvider {
  public readonly output: TransformerContextOutputProvider;

  public readonly resolvers: ResolverManager;

  public readonly dataSources: TransformerDataSourceManagerProvider;

  public readonly providerRegistry: TransformerContextProviderRegistry;

  public readonly stackManager: StackManagerProvider;

  public readonly assetManager: AssetManager;

  public readonly resourceHelper: TransformerResourceHelper;

  public readonly transformParameters: TransformParameters;

  public _api?: GraphQLAPIProvider;

  public readonly authConfig: AppSyncAuthConfiguration;

  private resolverConfig: ResolverConfig | undefined;

  public readonly dataSourceStrategies: Record<string, ModelDataSourceStrategy>;

  public readonly sqlDirectiveDataSourceStrategies: SqlDirectiveDataSourceStrategy[];

  public readonly rdsLayerMapping?: RDSLayerMapping;

  public readonly rdsSnsTopicMapping?: RDSSNSTopicMapping;

  public metadata: TransformerContextMetadata;

  public readonly synthParameters: SynthParameters;

  public readonly inputDocument: DocumentNode;

  constructor(options: TransformerContextConstructorOptions) {
    const {
      assetProvider,
      authConfig,
      sqlDirectiveDataSourceStrategies,
      dataSourceStrategies,
      inputDocument,
      nestedStackProvider,
      parameterProvider,
      rdsLayerMapping,
      rdsSnsTopicMapping,
      resolverConfig,
      scope,
      stackMapping,
      synthParameters,
      transformParameters,
    } = options;
    this.authConfig = authConfig;
    this.sqlDirectiveDataSourceStrategies = sqlDirectiveDataSourceStrategies ?? [];
    this.dataSources = new TransformerDataSourceManager();
    this.dataSourceStrategies = dataSourceStrategies;
    this.inputDocument = inputDocument;
    this.metadata = new TransformerContextMetadata();
    this.output = new TransformerOutput(inputDocument);
    this.providerRegistry = new TransformerContextProviderRegistry();
    this.rdsLayerMapping = rdsLayerMapping;
    this.rdsSnsTopicMapping = rdsSnsTopicMapping;
    this.resolverConfig = resolverConfig;
    this.resolvers = new ResolverManager();
    this.resourceHelper = new TransformerResourceHelper(synthParameters);
    this.stackManager = new StackManager(scope, nestedStackProvider, parameterProvider, stackMapping);
    this.assetManager = new AssetManager();
    this.assetManager.setAssetProvider(assetProvider);
    this.synthParameters = synthParameters;
    this.transformParameters = transformParameters;
    assetManager.setAssetProvider(assetProvider);
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
