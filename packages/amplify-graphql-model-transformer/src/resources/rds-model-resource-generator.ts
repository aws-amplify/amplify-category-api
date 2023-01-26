import * as cdk from '@aws-cdk/core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ModelResourceGenerator } from './model-resource-generator';

/**
 * An implementation of ModelResourceGenerator responsible for generated CloudFormation resources
 * for models backed by an RDS data source
 */
export class RdsModelResourceGenerator extends ModelResourceGenerator {
  protected generatorType = 'DynamoModelResourceGenerator';

  generateResources(scope: cdk.Construct, ctx: TransformerContextProvider): void {
  }
}
