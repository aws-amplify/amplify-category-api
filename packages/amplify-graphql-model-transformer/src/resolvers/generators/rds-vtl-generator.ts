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
import {
  generateSubscriptionRequestTemplate,
  generateSubscriptionResponseTemplate,
} from '../dynamodb';
import {
  ModelCreateInitSlotConfig,
  ModelCreateRequestConfig,
  ModelDefaultResponseConfig,
  ModelRequestConfig,
  ModelUpdateRequestConfig,
  ModelVTLGenerator,
} from './vtl-generator';

// TODO: This class is created only to show the class structure. This needs a revisit to generate correct resolvers for RDS.
/**
 *
 */
export class RDSModelVTLGenerator implements ModelVTLGenerator {
  /**
   *
   * @param config
   */
  generateUpdateRequestTemplate(config: ModelUpdateRequestConfig): string {
    return generateLambdaUpdateRequestTemplate(config.modelName, config.operationName, config.modelIndexFields ?? ['id']);
  }

  /**
   *
   * @param config
   */
  generateCreateRequestTemplate(config: ModelCreateRequestConfig): string {
    return generateLambdaCreateRequestTemplate(config.modelName, config.operationName);
  }

  /**
   *
   * @param config
   */
  generateCreateInitSlotTemplate(config: ModelCreateInitSlotConfig): string {
    return generateCreateInitSlotTemplate(config.modelConfig);
  }

  /**
   *
   * @param config
   */
  generateDeleteRequestTemplate(config: ModelUpdateRequestConfig): string {
    return generateLambdaDeleteRequestTemplate(config.modelName, config.operationName, config.modelIndexFields ?? ['id']);
  }

  /**
   *
   * @param config
   */
  generateUpdateInitSlotTemplate(config: ModelCreateInitSlotConfig): string {
    return generateUpdateInitSlotTemplate(config.modelConfig);
  }

  /**
   *
   * @param config
   */
  generateGetRequestTemplate(config: ModelRequestConfig): string {
    return generateLambdaRequestTemplate(config.modelName, config.operation, config.operationName);
  }

  /**
   *
   * @param config
   */
  generateGetResponseTemplate(config: ModelUpdateRequestConfig): string {
    return generateGetLambdaResponseTemplate(false);
  }

  /**
   *
   * @param config
   */
  generateListRequestTemplate(config: ModelRequestConfig): string {
    return generateLambdaListRequestTemplate(config.modelName, config.operation, config.operationName);
  }

  /**
   *
   * @param config
   */
  generateSyncRequestTemplate(config: ModelRequestConfig): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }

  /**
   *
   */
  generateSubscriptionRequestTemplate(): string {
    return generateSubscriptionRequestTemplate();
  }

  /**
   *
   */
  generateSubscriptionResponseTemplate(): string {
    return generateSubscriptionResponseTemplate();
  }

  /**
   *
   * @param config
   */
  generateDefaultResponseMappingTemplate(config: ModelDefaultResponseConfig): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
}
