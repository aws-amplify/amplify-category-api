import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { pathExistsSync } from 'fs-extra';
import { IAmplifyGraphqlDefinition } from './types';
import { ModelDataSourceStrategy } from './model-datasource-strategy';
import { constructCustomSqlDataSourceStrategies, constructDataSourceStrategies } from './internal';
import { isSQLLambdaModelDataSourceStrategy } from './sql-model-datasource-strategy';

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
   * @param dataSourceStrategy the provisioning definition for DataSources that resolve `@model`s in this schema. By default, Amplify will
   * use CloudFormation to provision a DynamoDB for each `@model`.
   * @experimental dataSourceStrategy
   * @returns a fully formed IAmplifyGraphqlDefinition definition, whose models will be resolved by the DataSource described by
   * `dataSourceStrategy`
   */
  static fromString(
    schema: string,
    dataSourceStrategy: ModelDataSourceStrategy = DEFAULT_MODEL_DATA_SOURCE_STRATEGY,
  ): IAmplifyGraphqlDefinition {
    return {
      schema,
      functionSlots: [],
      dataSourceStrategies: constructDataSourceStrategies(schema, dataSourceStrategy),
      customSqlDataSourceStrategies: constructCustomSqlDataSourceStrategies(schema, dataSourceStrategy),
    };
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema, binding them to a DynamoDB data source.
   * @param filePaths one or more paths to the graphql files to process
   * @returns a fully formed IAmplifyGraphqlDefinition, whose models will be resolved by DynamoDB tables created during deployment.
   */
  static fromFiles(...filePaths: string[]): IAmplifyGraphqlDefinition {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    return AmplifyGraphqlDefinition.fromFilesAndStrategy(filePaths);
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema
   *
   * **NOTE** This API is in preview and is not recommended to use with production systems.
   *
   * @experimental
   * @param filePaths one or more paths to the graphql files to process
   * @param dataSourceStrategy the provisioning definition for DataSources that resolve `@model`s in this schema. By default, Amplify will
   * use CloudFormation to provision a DynamoDB for each `@model`.
   * @returns a fully formed IAmplifyGraphqlDefinition definition, whose models will be resolved by the DataSource described by
   * `dataSourceStrategy`
   */
  static fromFilesAndStrategy(
    filePaths: string | string[],
    dataSourceStrategy: ModelDataSourceStrategy = DEFAULT_MODEL_DATA_SOURCE_STRATEGY,
  ): IAmplifyGraphqlDefinition {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    const schema = filePaths.map(schemaStringFromFilePath).join(os.EOL);
    return AmplifyGraphqlDefinition.fromString(schema, dataSourceStrategy);
  }

  /**
   * Combines multiple IAmplifyGraphqlDefinitions into a single definition. The schemas of each definition are combined, which means that
   * type names must be unique across all combined definitions. If a DataSourceStrategy includes a `name` field (as the
   * SQLLambdaModelDataSourceStrategy does), that name must be unique across all combined definitions, even if the same object literal is
   * used across definitions.
   *
   * **NOTE** This API is in preview and is not recommended to use with production systems.
   *
   * **Discussion**
   *
   * This API allows easy mapping of a group of models to a single data source. For example, you may have an existing SQL database that
   * tracks customer data, but want to set up a new loyalty program backed by a DynamoDB DataSource, and expose all of the data through a
   * single GraphQL API:
   *
   * ```ts
   * let myCustomSqlStrategy: SQLLambdaModelDataSourceStrategy;
   * const customerDefinition = AmplifyGraphqlDefinition.fromString(
   *   `type Customer {
   *     id: ID!
   *     name: String!
   *   }`, myCustomSqlStrategy);
   * const customerDefinition = AmplifyGraphqlDefinition.fromString(
   *   `type LoyaltyPointBalance {
   *     id: ID!
   *     customerId: ID!
   *     balance: Int
   *     customer: Customer @belongsTo
   *   }`);
   * const combinedDefinition = AmplifyGraphqlDefinition.combine([customerDefinition, loyaltyDefinition]);
   * ```
   *
   * The resulting combined definition will have a single `Customer` type, and a single `LoyaltyPointBalance` type. The `Customer` model
   * will be resolved via the SQL DataSource, and the `LoyaltyPointBalance` model will be resolved via a DynamoDB table created by Amplify.
   *
   * **NOTE** It is not supported to have a `manyToMany` relationship that spans multiple SQL DataSources, or one that includes both
   * DynamoDB and SQL DataSources.
   *
   * @experimental
   * @param definitions the definitions to combine
   * @returns a fully formed IAmplifyGraphqlDefinition definition, whose models will be resolved by the DataSources described by each
   * definition.
   */
  static combine(definitions: IAmplifyGraphqlDefinition[]): IAmplifyGraphqlDefinition {
    if (definitions.length === 0) {
      throw new Error('The definitions of amplify GraphQL cannot be empty.');
    }

    if (definitions.length === 1) {
      return definitions[0];
    }

    const dataSourceStrategies = definitions.reduce(
      (acc, cur) => ({ ...acc, ...cur.dataSourceStrategies }),
      {} as Record<string, ModelDataSourceStrategy>,
    );

    const caseInsensitiveSqlStrategyNames = Object.values(dataSourceStrategies)
      .filter(isSQLLambdaModelDataSourceStrategy)
      .map((ds) => ds.name.toLowerCase());

    if (caseInsensitiveSqlStrategyNames.length !== new Set(caseInsensitiveSqlStrategyNames).size) {
      throw new Error('The names of the SQLLambdaModelDataSourceStrategies must be unique across all combined definitions.');
    }

    return {
      schema: definitions.map((def) => def.schema).join(os.EOL),
      functionSlots: [],
      dataSourceStrategies: dataSourceStrategies,
    };
  }
}

const schemaStringFromFilePath = (filePath: string): string => {
  if (!pathExistsSync(filePath)) {
    throw new Error(`The file ${filePath} does not exist.`);
  }
  return new SchemaFile({ filePath }).definition;
};
