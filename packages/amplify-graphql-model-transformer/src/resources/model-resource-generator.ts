import * as cdk from '@aws-cdk/core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';

/**
 * Abstract class definition for ModelResourceGenerator
 * ModelResourceGenerator implementations are intended to create resources for the model transformer plugin
 * according to the data source that backs the model
 */
export abstract class ModelResourceGenerator {
  protected generatorType = 'ModelResourceGenerator';
  private enabled = false;
  protected modelNames: Array<string> = new Array<string>();

  /**
   * Returns the defined name for the generator
   * @returns generatorType of the generator
   */
  getGeneratorType(): string {
    return this.generatorType;
  }

  /**
   * Used to enable this generator for resources. If the method is not called, no resources will be generated.
   * This is done to prevent the generator from creating DynamoDB resources or related resources if they are unused
   */
  enableGenerator(): void {
    this.enabled = true;
  }

  abstract generateResources(scope: cdk.Construct, ctx: TransformerContextProvider): void;
}
