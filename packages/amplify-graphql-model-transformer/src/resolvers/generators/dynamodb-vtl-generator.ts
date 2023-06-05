import {
  ModelCreateInitSlotConfig,
  ModelCreateRequestConfig,
  ModelDefaultResponseConfig,
  ModelRequestConfig,
  ModelUpdateRequestConfig,
  ModelVTLGenerator,
} from './vtl-generator';
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

/**
 *
 */
export class DynamoDBModelVTLGenerator implements ModelVTLGenerator {
  /**
   *
   * @param config
   */
  generateUpdateRequestTemplate(config: ModelUpdateRequestConfig): string {
    return generateUpdateRequestTemplate(config.modelName, config.isSyncEnabled);
  }

  /**
   *
   * @param config
   */
  generateCreateRequestTemplate(config: ModelCreateRequestConfig): string {
    return generateCreateRequestTemplate(config.modelName, config.modelIndexFields);
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
    return generateDeleteRequestTemplate(config.modelName, config.isSyncEnabled);
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
    return generateGetRequestTemplate();
  }

  /**
   *
   * @param config
   */
  generateGetResponseTemplate(config: ModelUpdateRequestConfig): string {
    return generateGetResponseTemplate(config.isSyncEnabled);
  }

  /**
   *
   * @param config
   */
  generateListRequestTemplate(config: ModelRequestConfig): string {
    return generateListRequestTemplate();
  }

  /**
   *
   * @param config
   */
  generateSyncRequestTemplate(config: ModelRequestConfig): string {
    return generateSyncRequestTemplate();
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
    return generateDefaultResponseMappingTemplate(config.isSyncEnabled, config.mutation);
  }
}
