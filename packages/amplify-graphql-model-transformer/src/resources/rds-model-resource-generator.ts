import * as cdk from '@aws-cdk/core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ModelResourceGenerator } from './model-resource-generator';
import {DatasourceType} from '@aws-amplify/graphql-transformer-core';
import {DynamoDBModelVTLGenerator, ModelVTLGenerator, RDSModelVTLGenerator} from '../resolvers';

/**
 * An implementation of ModelResourceGenerator responsible for generated CloudFormation resources
 * for models backed by an RDS data source
 */
export class RdsModelResourceGenerator extends ModelResourceGenerator {
  protected generatorType = 'DynamoModelResourceGenerator';

  generateResources(ctx: TransformerContextProvider): void {
  }

  // eslint-disable-next-line class-methods-use-this
  getVTLGenerator(): ModelVTLGenerator {
    return new RDSModelVTLGenerator();
  }
}
