import { ModelDirectiveConfiguration } from '../../directive';
import { OperationConfig, ModelVTLGenerator } from './vtl-generator';
import {
  generateDefaultLambdaResponseMappingTemplate,
  generateGetLambdaResponseTemplate,
  generateLambdaRequestTemplate,
} from '../rds';

// TODO: This class is created only to show the class structure. This needs a revisit to generate correct resolvers for RDS.
export class RDSModelVTLGenerator implements ModelVTLGenerator {
  generateUpdateRequestTemplate(modelName: string, isSyncEnabled: boolean, config?: OperationConfig | undefined): string {
    return generateLambdaRequestTemplate(modelName, config?.operation!, config?.operationName!);
  }
  generateCreateRequestTemplate(modelName: string, modelIndexFields: string[], config?: OperationConfig | undefined): string {
    return generateLambdaRequestTemplate(modelName, config?.operation!, config?.operationName!);
  }
  generateCreateInitSlotTemplate(modelConfig: ModelDirectiveConfiguration, config?: OperationConfig | undefined): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateDeleteRequestTemplate(modelName: string, isSyncEnabled: boolean, config?: OperationConfig | undefined): string {
    return generateLambdaRequestTemplate(modelName, config?.operation!, config?.operationName!);
  }
  generateUpdateInitSlotTemplate(modelConfig: ModelDirectiveConfiguration, config?: OperationConfig | undefined): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateGetRequestTemplate(config?: OperationConfig | undefined): string {
    return generateGetLambdaResponseTemplate(false);
  }
  generateGetResponseTemplate(isSyncEnabled: boolean, config?: OperationConfig | undefined): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateListRequestTemplate(config?: OperationConfig | undefined): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateSyncRequestTemplate(config?: OperationConfig | undefined): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateSubscriptionRequestTemplate(config?: OperationConfig | undefined): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateSubscriptionResponseTemplate(config?: OperationConfig | undefined): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }
  generateDefaultResponseMappingTemplate(isSyncEnabled: boolean, mutation: boolean): string {
    return generateDefaultLambdaResponseMappingTemplate(false);
  }

}
