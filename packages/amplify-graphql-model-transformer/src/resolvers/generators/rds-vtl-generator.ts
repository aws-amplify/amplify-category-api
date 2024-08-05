import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { generateSubscriptionRequestTemplate, generateSubscriptionResponseTemplate } from '../dynamodb';
import {
  generateCreateInitSlotTemplate,
  generateDefaultLambdaResponseMappingTemplate,
  generateGetLambdaResponseTemplate,
  generateLambdaCreateRequestTemplate,
  generateLambdaDeleteRequestTemplate,
  generateLambdaListRequestTemplate,
  generateLambdaRequestTemplate,
  generateLambdaUpdateRequestTemplate,
  generateUpdateInitSlotTemplate,
} from '../rds';
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
  generateUpdateRequestTemplate(config: ModelUpdateRequestConfig, ctx: TransformerContextProvider): string {
    return generateLambdaUpdateRequestTemplate(config.modelName, config.operationName, config.modelIndexFields ?? ['id'], ctx);
  }

  generateCreateRequestTemplate(config: ModelCreateRequestConfig, ctx: TransformerContextProvider): string {
    return generateLambdaCreateRequestTemplate(config.modelName, config.operationName, ctx);
  }

  generateCreateInitSlotTemplate(config: ModelCreateInitSlotConfig, initializeIdField: boolean): string {
    return generateCreateInitSlotTemplate(config.modelConfig, initializeIdField);
  }

  generateDeleteRequestTemplate(config: ModelUpdateRequestConfig, ctx: TransformerContextProvider): string {
    return generateLambdaDeleteRequestTemplate(config.modelName, config.operationName, config.modelIndexFields ?? ['id'], ctx);
  }

  generateUpdateInitSlotTemplate(config: ModelCreateInitSlotConfig): string {
    return generateUpdateInitSlotTemplate(config.modelConfig);
  }

  generateGetRequestTemplate(config: ModelRequestConfig, ctx: TransformerContextProvider): string {
    return generateLambdaRequestTemplate(config.modelName, config.operation, config.operationName, ctx, true);
  }

  generateGetResponseTemplate(config: ModelUpdateRequestConfig): string {
    return generateGetLambdaResponseTemplate(false);
  }

  generateListRequestTemplate(config: ModelRequestConfig, ctx: TransformerContextProvider): string {
    return generateLambdaListRequestTemplate(config.modelName, config.operation, config.operationName, ctx);
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
    return generateDefaultLambdaResponseMappingTemplate(false, config.mutation);
  }
}
