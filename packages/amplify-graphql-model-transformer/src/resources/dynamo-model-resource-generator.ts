import * as cdk from '@aws-cdk/core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ModelResourceGenerator } from './model-resource-generator';

/**
 * DynamoModelResourceGenerator is an implementation of ModelResourceGenerator,
 * providing necessary utilities to generate the DynamoDB resources for models
 */
export class DynamoModelResourceGenerator extends ModelResourceGenerator {
  protected generatorType = 'DynamoModelResourceGenerator';

  generateResources(scope: cdk.Construct, ctx: TransformerContextProvider): void {
  }
}
