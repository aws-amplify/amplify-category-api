import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ModelDirectiveConfiguration } from '../../directive';

export type ModelRequestConfig = {
  modelName: string;
  operation: string;
  operationName: string;
};

export type ModelUpdateRequestConfig = ModelRequestConfig & {
  modelIndexFields: string[];
  isSyncEnabled: boolean;
};

export type ModelDeleteRequestConfig = ModelUpdateRequestConfig;

export type ModelCreateRequestConfig = ModelRequestConfig & {
  modelIndexFields: string[];
};

export type ModelCreateInitSlotConfig = {
  modelConfig: ModelDirectiveConfiguration;
};

export type ModelUpdateInitSlotConfig = ModelCreateInitSlotConfig;

export type ModelGetResponseConfig = ModelUpdateRequestConfig;

export type ModelDefaultResponseConfig = ModelRequestConfig & {
  isSyncEnabled: boolean;
  mutation: boolean;
};

export interface ModelVTLGenerator {
  generateUpdateRequestTemplate(config: ModelUpdateRequestConfig, ctx: TransformerContextProvider): string;
  generateCreateRequestTemplate(config: ModelCreateRequestConfig, ctx: TransformerContextProvider): string;
  generateCreateInitSlotTemplate(config: ModelCreateInitSlotConfig, initializeIdField: boolean): string;
  generateDeleteRequestTemplate(config: ModelDeleteRequestConfig, ctx: TransformerContextProvider): string;
  generateUpdateInitSlotTemplate(config: ModelUpdateInitSlotConfig): string;
  generateGetRequestTemplate(config: ModelRequestConfig, ctx: TransformerContextProvider): string;
  generateGetResponseTemplate(config: ModelGetResponseConfig): string;
  generateListRequestTemplate(config: ModelRequestConfig, ctx: TransformerContextProvider): string;
  generateSyncRequestTemplate(config: ModelRequestConfig): string;
  generateSubscriptionRequestTemplate(): string;
  generateSubscriptionResponseTemplate(): string;
  generateDefaultResponseMappingTemplate(config: ModelDefaultResponseConfig): string;
}
