import { ModelDirectiveConfiguration } from "../../directive";

export interface OperationConfig {
  operation?: string;
  operationName?: string;
}

export interface ModelVTLGenerator {
  generateUpdateRequestTemplate(modelName: string, isSyncEnabled: boolean, config?: OperationConfig): string;
  generateCreateRequestTemplate(modelName: string, modelIndexFields: string[], config?: OperationConfig): string;
  generateCreateInitSlotTemplate(modelConfig: ModelDirectiveConfiguration, config?: OperationConfig): string;
  generateDeleteRequestTemplate(modelName: string, isSyncEnabled: boolean, config?: OperationConfig): string;
  generateUpdateInitSlotTemplate(modelConfig: ModelDirectiveConfiguration, config?: OperationConfig): string;
  generateGetRequestTemplate(config?: OperationConfig): string;
  generateGetResponseTemplate(isSyncEnabled: boolean, config?: OperationConfig): string;
  generateListRequestTemplate(config?: OperationConfig): string;
  generateSyncRequestTemplate(config?: OperationConfig): string;
  generateSubscriptionRequestTemplate(config?: OperationConfig): string;
  generateSubscriptionResponseTemplate(config?: OperationConfig): string;
  generateDefaultResponseMappingTemplate(isSyncEnabled: boolean, mutation: boolean): string;
}
