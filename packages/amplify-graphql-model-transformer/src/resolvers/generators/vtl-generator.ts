import { ModelDirectiveConfiguration } from "../../directive";

export type ModelRequestConfig = {
  operation: string;
  operationName: string;
}

export type ModelUpdateRequestConfig = ModelRequestConfig & {
  modelName: string;
  isSyncEnabled: boolean;
}

export type ModelDeleteRequestConfig = ModelUpdateRequestConfig;

export type ModelCreateRequestConfig = ModelRequestConfig & {
  modelName: string;
  modelIndexFields: string[];
}

export type ModelCreateInitSlotConfig = {
  modelConfig: ModelDirectiveConfiguration;
}

export type ModelUpdateInitSlotConfig = ModelCreateInitSlotConfig;

export type ModelGetResponseConfig = ModelUpdateRequestConfig;

export type ModelDefaultResponseConfig = ModelRequestConfig & {
  isSyncEnabled: boolean;
  mutation: boolean;
}

export interface ModelVTLGenerator {
  generateUpdateRequestTemplate(config: ModelUpdateRequestConfig): string;
  generateCreateRequestTemplate(config: ModelCreateRequestConfig): string;
  generateCreateInitSlotTemplate(config: ModelCreateInitSlotConfig): string;
  generateDeleteRequestTemplate(config: ModelDeleteRequestConfig): string;
  generateUpdateInitSlotTemplate(config: ModelUpdateInitSlotConfig): string;
  generateGetRequestTemplate(config: ModelRequestConfig): string;
  generateGetResponseTemplate(config: ModelGetResponseConfig): string;
  generateListRequestTemplate(config: ModelRequestConfig): string;
  generateSyncRequestTemplate(config: ModelRequestConfig): string;
  generateSubscriptionRequestTemplate(): string;
  generateSubscriptionResponseTemplate(): string;
  generateDefaultResponseMappingTemplate(config: ModelDefaultResponseConfig): string;
}
