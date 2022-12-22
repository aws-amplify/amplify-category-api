import { Stack } from 'aws-cdk-lib';
import { GraphQLAPIProvider, MappingTemplateProvider } from '../graphql-api-provider';
import { DataSourceProvider } from './transformer-datasource-provider';
import { TransformerContextProvider } from './transformer-context-provider';
import { AppSyncExecutionStrategy } from '../appsync-execution-strategy';

export interface TransformerResolverProvider {
  /**
   * @deprecated use addToSlotWithStrategy, which supports all appsync runtimes
   */
  addToSlot: (
    slotName: string,
    requestMappingTemplate?: MappingTemplateProvider,
    responseMappingTemplate?: MappingTemplateProvider,
    dataSource?: DataSourceProvider,
  ) => void;
  addToSlotWithStrategy: (
    slotName: string,
    strategy: AppSyncExecutionStrategy,
    dataSource?: DataSourceProvider,
  ) => void;
  synthesize: (context: TransformerContextProvider, api: GraphQLAPIProvider) => void;
  mapToStack: (stack: Stack) => void;
}

export interface TransformerResolversManagerProvider {
  addResolver: (typeName: string, fieldName: string, resolver: TransformerResolverProvider) => TransformerResolverProvider;
  getResolver: (typeName: string, fieldName: string) => TransformerResolverProvider | void;
  hasResolver: (typeName: string, fieldName: string) => boolean;
  removeResolver: (typeName: string, fieldName: string) => TransformerResolverProvider;
  collectResolvers: () => Map<string, TransformerResolverProvider>;

  /**
   * @deprecated use generateQueryResolverWithStrategy, which supports all appsync runtimes
   */
  generateQueryResolver: (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    dataSource: DataSourceProvider,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ) => TransformerResolverProvider;

  generateQueryResolverWithStrategy: (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    dataSource: DataSourceProvider,
    strategy: AppSyncExecutionStrategy,
  ) => TransformerResolverProvider;

  /**
   * @deprecated use generateMutationResolverWithStrategy, which supports all appsync runtimes
   */
  generateMutationResolver: (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    dataSource: DataSourceProvider,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ) => TransformerResolverProvider;

  generateMutationResolverWithStrategy: (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    dataSource: DataSourceProvider,
    strategy: AppSyncExecutionStrategy,
  ) => TransformerResolverProvider;

  /**
   * @deprecated use generateSubscriptionResolverWithStrategy, which supports all appsync runtimes
   */
  generateSubscriptionResolver: (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ) => TransformerResolverProvider;

  generateSubscriptionResolverWithStrategy: (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    strategy: AppSyncExecutionStrategy,
  ) => TransformerResolverProvider;
}
