import {
  generateDefaultLambdaResponseMappingTemplate,
  generateGetLambdaResponseTemplate,
  generateLambdaRequestTemplate
} from '../rds';
import { 
  ModelCreateInitSlotConfig, 
  ModelCreateRequestConfig, 
  ModelDefaultResponseConfig, 
  ModelRequestConfig, 
  ModelUpdateRequestConfig, 
  ModelVTLGenerator 
} from "./vtl-generator";

// TODO: This class is created only to show the class structure. This needs a revisit to generate correct resolvers for RDS.
export class RDSModelVTLGenerator implements ModelVTLGenerator {
  generateUpdateRequestTemplate(config: ModelUpdateRequestConfig): string {
    return generateLambdaRequestTemplate(config.modelName, config.operation, config.operationName);
  }
  generateCreateRequestTemplate(config: ModelCreateRequestConfig): string {
    return generateLambdaRequestTemplate(config.modelName, config.operation, config.operationName);
  }
  generateCreateInitSlotTemplate(config: ModelCreateInitSlotConfig): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateDeleteRequestTemplate(config: ModelUpdateRequestConfig): string {
    return generateLambdaRequestTemplate(config.modelName, config.operation, config.operationName);
  }
  generateUpdateInitSlotTemplate(config: ModelCreateInitSlotConfig): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateGetRequestTemplate(config: ModelRequestConfig): string {
    return generateGetLambdaResponseTemplate(false);
  }
  generateGetResponseTemplate(config: ModelUpdateRequestConfig): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateListRequestTemplate(config: ModelRequestConfig): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateSyncRequestTemplate(config: ModelRequestConfig): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateSubscriptionRequestTemplate(): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateSubscriptionResponseTemplate(): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateDefaultResponseMappingTemplate(config: ModelDefaultResponseConfig): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
}
