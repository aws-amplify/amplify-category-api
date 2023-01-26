import { ModelVTLGenerator } from "./vtl-generator";
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
  public generateUpdateRequestTemplate = generateUpdateRequestTemplate;
  public generateCreateRequestTemplate = generateCreateRequestTemplate;
  public generateCreateInitSlotTemplate = generateCreateInitSlotTemplate;
  public generateDeleteRequestTemplate = generateDeleteRequestTemplate;
  public generateUpdateInitSlotTemplate = generateUpdateInitSlotTemplate;
  public generateGetRequestTemplate = generateGetRequestTemplate;
  public generateGetResponseTemplate = generateGetResponseTemplate;
  public generateListRequestTemplate = generateListRequestTemplate;
  public generateSyncRequestTemplate = generateSyncRequestTemplate;
  public generateSubscriptionRequestTemplate = generateSubscriptionRequestTemplate;
  public generateSubscriptionResponseTemplate = generateSubscriptionResponseTemplate;
  public generateDefaultResponseMappingTemplate = generateDefaultResponseMappingTemplate;
}
