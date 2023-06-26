import {
  GraphQLAPIProvider,
  StackManagerProvider,
  TransformerContextOutputProvider,
  TransformerContextProvider,
  TransformerDataSourceManagerProvider,
  AppSyncAuthConfiguration,
  AmplifyApiGraphQlResourceStackTemplate,
} from '@aws-amplify/graphql-transformer-interfaces';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import { TransformerContextMetadataProvider } from '@aws-amplify/graphql-transformer-interfaces/src/transformer-context/transformer-context-provider';
import { App } from 'aws-cdk-lib';
import { DocumentNode } from 'graphql';
import { DatasourceType } from '../config/project-config';
import { ResolverConfig } from '../config/transformer-config';
import { TransformerDataSourceManager } from './datasource';
import { TransformerOutput } from './output';
import { TransformerContextProviderRegistry } from './provider-registry';
import { ResolverManager } from './resolver';
import { TransformerResourceHelper } from './resource-helper';
import { StackManager } from './stack-manager';
import { RDSConnectionSecrets } from '../types';

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

  public has(key: string) {
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
  public readonly modelToDatasourceMap: Map<string, DatasourceType>;
  public readonly datasourceSecretParameterLocations: Map<string, RDSConnectionSecrets>;

  public metadata: TransformerContextMetadata;
  constructor(
    app: App,
    public readonly inputDocument: DocumentNode,
    modelToDatasourceMap: Map<string, DatasourceType>,
    stackMapping: Record<string, string>,
    authConfig: AppSyncAuthConfiguration,
    transformParameters: TransformParameters,
    resolverConfig?: ResolverConfig,
    datasourceSecretParameterLocations?: Map<string, RDSConnectionSecrets>,
  ) {
    this.output = new TransformerOutput(inputDocument);
    this.resolvers = new ResolverManager();
    this.dataSources = new TransformerDataSourceManager();
    this.providerRegistry = new TransformerContextProviderRegistry();
    const stackManager = new StackManager(app, stackMapping);
    this.stackManager = stackManager;
    this.authConfig = authConfig;
    this.resourceHelper = new TransformerResourceHelper(stackManager);
    this.transformParameters = transformParameters;
    this.resolverConfig = resolverConfig;
    this.metadata = new TransformerContextMetadata();
    this.modelToDatasourceMap = modelToDatasourceMap;
    this.datasourceSecretParameterLocations = datasourceSecretParameterLocations ?? new Map<string, RDSConnectionSecrets>();
  }

  /**
   * Internal method to set the GraphQL API
   * @param api API instance available publicaly when the transformation starts
   * @internal
   */
  public bind(api: GraphQLAPIProvider) {
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
