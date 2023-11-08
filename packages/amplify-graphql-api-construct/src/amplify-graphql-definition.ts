import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { IAmplifyGraphqlDefinition, ModelDataSourceDefinition } from './types';
import { constructDataSourceDefinitionMap } from './internal';

export const DEFAULT_MODEL_DATA_SOURCE_DEFINITION: ModelDataSourceDefinition = {
  name: 'DefaultDynamoDB',
  strategy: {
    dbType: 'DYNAMODB',
    provisionStrategy: 'DEFAULT',
  },
};
/**
 * Class exposing utilities to produce IAmplifyGraphqlDefinition objects given various inputs.
 */
export class AmplifyGraphqlDefinition {
  /**
   * Produce a schema definition from a string input.
   * @param schema the graphql input as a string
   * @param modelDataSourceDefinition the provision definition for `@model` datasource. The DynamoDB from CloudFormation will be used by
   * default.
   * @experimental modelDataSourceDefinition
   * @returns a fully formed amplify graphql definition
   */
  static fromString(
    schema: string,
    modelDataSourceDefinition: ModelDataSourceDefinition = DEFAULT_MODEL_DATA_SOURCE_DEFINITION,
  ): IAmplifyGraphqlDefinition {
    return {
      schema,
      functionSlots: [],
      dataSourceDefinition: constructDataSourceDefinitionMap(schema, modelDataSourceDefinition),
    };
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema, binding them to a DynamoDB data source.
   * @param filePaths one or more paths to the graphql files to process
   * @returns a fully formed amplify graphql definition, whose models will be resolved by DynamoDB tables created during deployment.
   */
  static fromFiles(...filePaths: string[]): IAmplifyGraphqlDefinition {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    const schema = filePaths.map((filePath) => new SchemaFile({ filePath }).definition).join(os.EOL);
    return {
      schema,
      functionSlots: [],
      dataSourceDefinition: constructDataSourceDefinitionMap(schema, DEFAULT_MODEL_DATA_SOURCE_DEFINITION),
    };
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema
   * @experimental
   * @param filePaths one or more paths to the graphql files to process
   * @param modelDataSourceDefinition the provision definition for `@model` datasource. The DynamoDB from CloudFormation will be used by
   * default.
   * @returns a fully formed amplify graphql definition
   */
  static fromFilesAndDefinition(
    filePaths: string | string[],
    modelDataSourceDefinition: ModelDataSourceDefinition = DEFAULT_MODEL_DATA_SOURCE_DEFINITION,
  ): IAmplifyGraphqlDefinition {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    const schema = filePaths.map((filePath) => new SchemaFile({ filePath }).definition).join(os.EOL);
    return {
      schema,
      functionSlots: [],
      dataSourceDefinition: constructDataSourceDefinitionMap(schema, modelDataSourceDefinition),
    };
  }

  /**
   * Combines multiple IAmplifyGraphqlDefinitions into a single definition.
   * @experimental
   * @param definitions the definitions to combine
   */
  static combine(definitions: IAmplifyGraphqlDefinition[]): IAmplifyGraphqlDefinition {
    if (definitions.length === 0) {
      throw new Error('The definitions of amplify GraphQL cannot be empty.');
    }
    if (definitions.length === 1) {
      return definitions[0];
    }
    return {
      schema: definitions.map((def) => def.schema).join(os.EOL),
      functionSlots: [],
      dataSourceDefinition: definitions.reduce((acc, cur) => ({ ...acc, ...cur.dataSourceDefinition }), {}),
    };
  }
}
