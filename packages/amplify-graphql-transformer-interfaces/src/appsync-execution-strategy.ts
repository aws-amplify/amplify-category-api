import { MappingTemplateProvider } from "./graphql-api-provider";

export type AppSyncRuntime = {
  name: string;
  runtimeVersion: string;
};

export type AppSyncTemplateExecutionStrategy = {
  type: 'TEMPLATE',
  requestMappingTemplate?: MappingTemplateProvider,
  responseMappingTemplate?: MappingTemplateProvider,
};

export type AppSyncCodeExecutionStrategy = {
  type: 'CODE',
  code: MappingTemplateProvider,
  runtime: AppSyncRuntime,
};

export type AppSyncExecutionStrategy = AppSyncTemplateExecutionStrategy | AppSyncCodeExecutionStrategy;
