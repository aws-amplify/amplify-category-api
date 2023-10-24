import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { ModelDataSourceBinding, IAmplifyGraphqlDefinition } from './types';

const DEFAULT_DATA_SOURCE_BINDING: ModelDataSourceBinding = {
  bindingType: 'DynamoDB',
};

/**
 * Class exposing utilities to produce IAmplifyGraphqlDefinition objects given various inputs.
 */
export class AmplifyGraphqlDefinition {
  /**
   * Produce a schema definition from a string input.
   * @param schema the graphql input as a string
   * @param modelDataSourceBinding the ModelDataSourceBinding to use for the schema. This parameter is @experimental
   * @returns a fully formed amplify graphql definition, whose models will be resolved by the data source specifed in the
   *   modelDataSourceBinding
   */
  static fromString(
    schema: string,
    modelDataSourceBinding: ModelDataSourceBinding = DEFAULT_DATA_SOURCE_BINDING,
  ): IAmplifyGraphqlDefinition {
    return {
      schema,
      functionSlots: [],
      modelDataSourceBinding,
    };
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema, binding them to a DynamoDB data source.
   * @param filePaths one or more paths to the graphql files to process
   * @returns a fully formed amplify graphql definition, whose models will be resolved by DynamoDB tables created during deployment.
   */
  static fromFiles(...filePaths: string[]): IAmplifyGraphqlDefinition {
    return AmplifyGraphqlDefinition.fromFilesAndBinding(filePaths, DEFAULT_DATA_SOURCE_BINDING);
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema, binding them with the specified ModelDataSourceBinding.
   * @param filePaths one or more paths to the graphql files to process
   * @param modelDataSourceBinding the ModelDataSourceBinding to use for the schema.
   * @returns a fully formed amplify graphql definition, whose models will be resolved by the data source specifed in the
   *   modelDataSourceBinding
   * @experimental
   */
  static fromFilesAndBinding(filePaths: string[], modelDataSourceBinding: ModelDataSourceBinding): IAmplifyGraphqlDefinition {
    const schema = filePaths.map((filePath) => new SchemaFile({ filePath }).definition).join(os.EOL);
    return AmplifyGraphqlDefinition.fromString(schema, modelDataSourceBinding);
  }
}
