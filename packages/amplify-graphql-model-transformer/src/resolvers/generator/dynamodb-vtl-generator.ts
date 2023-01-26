import { ModelCreateInitSlotConfig, ModelCreateRequestConfig, ModelDefaultResponseConfig, ModelRequestConfig, ModelUpdateRequestConfig, ModelVTLGenerator } from "./vtl-generator";
import {
  generateUpdateRequestTemplate,
  generateCreateRequestTemplate,
  generateCreateInitSlotTemplate,
  generateDeleteRequestTemplate,
  generateUpdateInitSlotTemplate,
  generateGetRequestTemplate,
  generateGetResponseTemplate,
  generateListRequestTemplate,
  generateSyncRequestTemplate,
  generateSubscriptionRequestTemplate,
  generateSubscriptionResponseTemplate,
  generateDefaultResponseMappingTemplate,
} from '../dynamodb';

export class DynamoDBModelVTLGenerator implements ModelVTLGenerator {
  generateUpdateRequestTemplate(config: ModelUpdateRequestConfig): string {
    return generateUpdateRequestTemplate(config.modelName, config.isSyncEnabled);
  }
  generateCreateRequestTemplate(config: ModelCreateRequestConfig): string {
    return generateCreateRequestTemplate(config.modelName, config.modelIndexFields);
  }
  generateCreateInitSlotTemplate(config: ModelCreateInitSlotConfig): string {
    return generateCreateInitSlotTemplate(config.modelConfig);
  }
  generateDeleteRequestTemplate(config: ModelUpdateRequestConfig): string {
    return generateDeleteRequestTemplate(config.modelName, config.isSyncEnabled);
  }
  generateUpdateInitSlotTemplate(config: ModelCreateInitSlotConfig): string {
    return generateUpdateInitSlotTemplate(config.modelConfig);
  }
  generateGetRequestTemplate(config: ModelRequestConfig): string {
    return generateGetRequestTemplate();
  }
  generateGetResponseTemplate(config: ModelUpdateRequestConfig): string {
    return generateGetResponseTemplate(config.isSyncEnabled);
  }
  generateListRequestTemplate(config: ModelRequestConfig): string {
    return generateListRequestTemplate();
  }
  generateSyncRequestTemplate(config: ModelRequestConfig): string {
    return generateSyncRequestTemplate();
  }
  generateSubscriptionRequestTemplate(): string {
    return generateSubscriptionRequestTemplate();
  }
  generateSubscriptionResponseTemplate(): string {
    return generateSubscriptionResponseTemplate();
  }
  generateDefaultResponseMappingTemplate(config: ModelDefaultResponseConfig): string {
    return generateDefaultResponseMappingTemplate(config.isSyncEnabled, config.mutation);
  }
}
