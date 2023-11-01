import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { IAmplifyGraphqlDefinition, ModelDataSourceDefinition } from './types';
import { getModelTypeNames } from './internal';

export const DEFAULT_MODEL_DATA_SOURCE_DEFINITION: ModelDataSourceDefinition = {
  name: 'defaultDDB',
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
   * Produce a schema definition from a string input
   * @param schema the graphql input as a string
   * @param modelDataSourceDefinition the provision definition for `@model` datasource. The DynamoDB from CloudFormation will be used by default.
   * @returns a fully formed amplify graphql definition
   */
  static fromString(
    schema: string,
    modelDataSourceDefinition: ModelDataSourceDefinition = DEFAULT_MODEL_DATA_SOURCE_DEFINITION,
  ): IAmplifyGraphqlDefinition {
    return {
      schema,
      functionSlots: [],
      dataSourceProvisionConfig: {
        default: modelDataSourceDefinition,
      },
    };
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema
   * @param filePaths one or more paths to the graphql files to process
   * @returns a fully formed amplify graphql definition
   */
  static fromFiles(...filePaths: string[]): IAmplifyGraphqlDefinition {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    return {
      schema: filePaths.map((filePath) => new SchemaFile({ filePath }).definition).join(os.EOL),
      functionSlots: [],
      dataSourceProvisionConfig: {
        default: DEFAULT_MODEL_DATA_SOURCE_DEFINITION,
      },
    };
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema
   * @param filePaths one or more paths to the graphql files to process
   * @param modelDataSourceDefinition the provision definition for `@model` datasource. The DynamoDB from CloudFormation will be used by default.
   * @returns a fully formed amplify graphql definition
   */
  static fromFilesAndDefinition(
    filePaths: string | string[],
    modelDataSourceDefinition: ModelDataSourceDefinition = DEFAULT_MODEL_DATA_SOURCE_DEFINITION,
  ): IAmplifyGraphqlDefinition {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    return {
      schema: filePaths.map((filePath) => new SchemaFile({ filePath }).definition).join(os.EOL),
      functionSlots: [],
      dataSourceProvisionConfig: {
        default: modelDataSourceDefinition,
      },
    };
  }

  /**
   * Combines multiple IAmplifyGraphqlDefinitions into a single definition.
   * @param definitions the definitions to combine
   */
  static combine(...definitions: IAmplifyGraphqlDefinition[]): IAmplifyGraphqlDefinition {
    if (definitions.length === 0) {
      throw new Error('The definitions of amplify GraphQL cannot be empty.');
    }
    if (definitions.length === 1) {
      return definitions[0];
    }
    const defaultStrategy = definitions[0].dataSourceProvisionConfig.default;
    const datasourceConfigPerModelMap = definitions
      .slice(1)
      .filter((def) => def.dataSourceProvisionConfig.default !== defaultStrategy)
      .reduce((acc, cur) => {
        const modelTypeNames = getModelTypeNames(cur.schema);
        const modelProvisionStrategyMap = modelTypeNames.reduce((a, c) => ({ ...a, [c]: cur.dataSourceProvisionConfig.default }), {});
        return {
          ...acc,
          ...modelProvisionStrategyMap,
        };
      }, {});
    return {
      schema: definitions.map((def) => def.schema).join(os.EOL),
      functionSlots: [],
      dataSourceProvisionConfig: {
        default: defaultStrategy,
        models: datasourceConfigPerModelMap,
      },
    };
  }
}
