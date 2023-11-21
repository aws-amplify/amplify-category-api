import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { IAmplifyGraphqlDefinition } from './types';
import { constructDataSourceStrategyMap } from './internal';
import { ModelDataSourceStrategy } from './model-datasource-strategy';
import { constructCustomSqlDataSourceStrategies } from './internal/data-source-config';

export const DEFAULT_MODEL_DATA_SOURCE_STRATEGY: ModelDataSourceStrategy = {
  dbType: 'DYNAMODB',
  provisionStrategy: 'DEFAULT',
};

/**
 * Class exposing utilities to produce IAmplifyGraphqlDefinition objects given various inputs.
 */
export class AmplifyGraphqlDefinition {
  /**
   * Produce a schema definition from a string input.
   *
   * **NOTE** The 'dataSourceStrategy' configuration option is in preview and is not recommended to use with production systems.
   *
   * @param schema the graphql input as a string
   * @param dataSourceStrategy the provisioning definition for datasources that resolve `@model`s and custom SQL statements in this schema.
   * The DynamoDB from CloudFormation will be used by default.
   * @experimental dataSourceStrategy
   * @returns a fully formed amplify graphql definition
   */
  static fromString(
    schema: string,
    dataSourceStrategy: ModelDataSourceStrategy = DEFAULT_MODEL_DATA_SOURCE_STRATEGY,
  ): IAmplifyGraphqlDefinition {
    return {
      schema,
      functionSlots: [],
      referencedLambdaFunctions: {},
      dataSourceStrategies: constructDataSourceStrategyMap(schema, dataSourceStrategy),
      customSqlDataSourceStrategies: constructCustomSqlDataSourceStrategies(schema, dataSourceStrategy),
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
    return AmplifyGraphqlDefinition.fromString(schema, DEFAULT_MODEL_DATA_SOURCE_STRATEGY);
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema
   *
   * **NOTE** This API is in preview and is not recommended to use with production systems.
   *
   * @experimental
   * @param filePaths one or more paths to the graphql files to process
   * @param dataSourceStrategy the provisioning definition for datasources that resolve `@model`s in this schema. The DynamoDB from
   * CloudFormation will be used by default.
   * @returns a fully formed amplify graphql definition
   */
  static fromFilesAndStrategy(
    filePaths: string | string[],
    dataSourceStrategy: ModelDataSourceStrategy = DEFAULT_MODEL_DATA_SOURCE_STRATEGY,
  ): IAmplifyGraphqlDefinition {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    const schema = filePaths.map((filePath) => new SchemaFile({ filePath }).definition).join(os.EOL);
    return AmplifyGraphqlDefinition.fromString(schema, dataSourceStrategy);
  }

  /**
   * Combines multiple IAmplifyGraphqlDefinitions into a single definition.
   *
   * **NOTE** This API is in preview and is not recommended to use with production systems.
   *
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
      referencedLambdaFunctions: definitions.reduce((acc, cur) => ({ ...acc, ...cur.referencedLambdaFunctions }), {}),
      dataSourceStrategies: definitions.reduce((acc, cur) => ({ ...acc, ...cur.dataSourceStrategies }), {}),
    };
  }
}
