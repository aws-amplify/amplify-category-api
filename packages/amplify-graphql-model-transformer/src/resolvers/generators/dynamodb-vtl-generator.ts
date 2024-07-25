import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
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
import {
  ModelCreateInitSlotConfig,
  ModelCreateRequestConfig,
  ModelDefaultResponseConfig,
  ModelRequestConfig,
  ModelUpdateRequestConfig,
  ModelVTLGenerator,
} from './vtl-generator';

export class DynamoDBModelVTLGenerator implements ModelVTLGenerator {
  generateUpdateRequestTemplate(config: ModelUpdateRequestConfig, ctx: TransformerContextProvider): string {
    return generateUpdateRequestTemplate(config.modelName, config.isSyncEnabled);
  }

  generateCreateRequestTemplate(config: ModelCreateRequestConfig, ctx: TransformerContextProvider): string {
    return generateCreateRequestTemplate(config.modelName, config.modelIndexFields);
  }

  generateCreateInitSlotTemplate(config: ModelCreateInitSlotConfig, initializeIdField: boolean): string {
    return generateCreateInitSlotTemplate(config.modelConfig, initializeIdField);
  }

  generateDeleteRequestTemplate(config: ModelUpdateRequestConfig, ctx: TransformerContextProvider): string {
    return generateDeleteRequestTemplate(config.modelName, config.isSyncEnabled);
  }

  generateUpdateInitSlotTemplate(config: ModelCreateInitSlotConfig): string {
    return generateUpdateInitSlotTemplate(config.modelConfig);
  }

  generateGetRequestTemplate(config: ModelRequestConfig, ctx: TransformerContextProvider): string {
    return generateGetRequestTemplate();
  }

  generateGetResponseTemplate(config: ModelUpdateRequestConfig): string {
    return generateGetResponseTemplate(config.isSyncEnabled);
  }

  generateListRequestTemplate(config: ModelRequestConfig, ctx: TransformerContextProvider): string {
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
