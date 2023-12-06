import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { isSqlStrategy } from '@aws-amplify/graphql-transformer-core';
import { IAmplifyGraphqlDefinition } from './types';
import { constructDataSourceStrategies } from './internal';
import { CustomSqlDataSourceStrategy, ModelDataSourceStrategy } from './model-datasource-strategy-types';
import {
  constructCustomSqlDataSourceStrategies,
  schemaByMergingDefinitions,
  validateDataSourceStrategy,
} from './internal/data-source-config';

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
   * @param schema the graphql input as a string
   * @param dataSourceStrategy the provisioning definition for datasources that resolve `@model`s and custom SQL statements in this schema.
   * The DynamoDB from CloudFormation will be used by default.
   * @returns a fully formed amplify graphql definition
   */
  static fromString(
    schema: string,
    dataSourceStrategy: ModelDataSourceStrategy = DEFAULT_MODEL_DATA_SOURCE_STRATEGY,
  ): IAmplifyGraphqlDefinition {
    validateDataSourceStrategy(dataSourceStrategy);
    return {
      schema,
      functionSlots: [],
      referencedLambdaFunctions: {},
      dataSourceStrategies: constructDataSourceStrategies(schema, dataSourceStrategy),
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
   * @param definitions the definitions to combine
   */
  static combine(definitions: IAmplifyGraphqlDefinition[]): IAmplifyGraphqlDefinition {
    if (definitions.length === 0) {
      throw new Error('The definitions of amplify GraphQL cannot be empty.');
    }
    if (definitions.length === 1) {
      return definitions[0];
    }

    // A strategy will be present multiple times in a given definition: once per model. We'll create a unique list per definition to ensure
    // no reuse across definitions.
    let combinedStrategyNames: string[] = [];
    for (const definition of definitions) {
      const definitionStrategyNames = new Set<string>();
      for (const strategy of Object.values(definition.dataSourceStrategies)) {
        if (!isSqlStrategy(strategy)) {
          continue;
        }
        const strategyName = strategy.name;
        if (combinedStrategyNames.includes(strategyName)) {
          throw new Error(
            `The SQL-based ModelDataSourceStrategy '${strategyName}' was found in multiple definitions, but a strategy name cannot be ` +
              "shared between definitions. To specify a SQL-based API with schemas across multiple files, use 'fromFilesAndStrategy'",
          );
        }
        definitionStrategyNames.add(strategyName);
      }
      combinedStrategyNames = [...combinedStrategyNames, ...definitionStrategyNames];
    }

    const customSqlDataSourceStrategies = definitions.reduce(
      (acc, cur) => [...acc, ...(cur.customSqlDataSourceStrategies ?? [])],
      [] as CustomSqlDataSourceStrategy[],
    );

    const mergedSchema = schemaByMergingDefinitions(definitions);

    return {
      schema: mergedSchema,
      functionSlots: [],
      referencedLambdaFunctions: definitions.reduce((acc, cur) => ({ ...acc, ...cur.referencedLambdaFunctions }), {}),
      dataSourceStrategies: definitions.reduce((acc, cur) => ({ ...acc, ...cur.dataSourceStrategies }), {}),
      customSqlDataSourceStrategies,
    };
  }
}
