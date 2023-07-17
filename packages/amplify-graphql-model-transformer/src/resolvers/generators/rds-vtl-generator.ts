import {
  generateDefaultLambdaResponseMappingTemplate,
  generateGetLambdaResponseTemplate,
  generateLambdaRequestTemplate,
  generateCreateInitSlotTemplate,
  generateLambdaCreateRequestTemplate,
  generateUpdateInitSlotTemplate,
  generateLambdaUpdateRequestTemplate,
  generateLambdaDeleteRequestTemplate,
  generateLambdaListRequestTemplate,
} from '../rds';
import { generateSubscriptionRequestTemplate, generateSubscriptionResponseTemplate } from '../dynamodb';
import {
  ModelCreateInitSlotConfig,
  ModelCreateRequestConfig,
  ModelDefaultResponseConfig,
  ModelRequestConfig,
  ModelUpdateRequestConfig,
  ModelVTLGenerator,
} from './vtl-generator';

// TODO: This class is created only to show the class structure. This needs a revisit to generate correct resolvers for RDS.
export class RDSModelVTLGenerator implements ModelVTLGenerator {
  generateUpdateRequestTemplate(config: ModelUpdateRequestConfig): string {
    return generateLambdaUpdateRequestTemplate(config.modelName, config.operationName, config.modelIndexFields ?? ['id']);
  }

  generateCreateRequestTemplate(config: ModelCreateRequestConfig): string {
    return generateLambdaCreateRequestTemplate(config.modelName, config.operationName);
  }

  generateCreateInitSlotTemplate(config: ModelCreateInitSlotConfig): string {
    return generateCreateInitSlotTemplate(config.modelConfig);
  }

  generateDeleteRequestTemplate(config: ModelUpdateRequestConfig): string {
    return generateLambdaDeleteRequestTemplate(config.modelName, config.operationName, config.modelIndexFields ?? ['id']);
  }

  generateUpdateInitSlotTemplate(config: ModelCreateInitSlotConfig): string {
    return generateUpdateInitSlotTemplate(config.modelConfig);
  }

  generateGetRequestTemplate(config: ModelRequestConfig): string {
    return generateLambdaRequestTemplate(config.modelName, config.operation, config.operationName);
  }

  generateGetResponseTemplate(config: ModelUpdateRequestConfig): string {
    return generateGetLambdaResponseTemplate(false);
  }

  generateListRequestTemplate(config: ModelRequestConfig): string {
    return generateLambdaListRequestTemplate(config.modelName, config.operation, config.operationName);
  }

  generateSyncRequestTemplate(config: ModelRequestConfig): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }

  generateSubscriptionRequestTemplate(): string {
    return generateSubscriptionRequestTemplate();
  }

  generateSubscriptionResponseTemplate(): string {
    return generateSubscriptionResponseTemplate();
  }

  generateDefaultResponseMappingTemplate(config: ModelDefaultResponseConfig): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
}
