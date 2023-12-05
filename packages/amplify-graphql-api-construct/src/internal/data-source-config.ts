import { parse } from 'graphql';
import { isSqlStrategy, isQueryNode, isMutationNode, fieldsWithSqlDirective } from '@aws-amplify/graphql-transformer-core';
import { DataSourceStrategiesProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  CustomSqlDataSourceStrategy as ConstructCustomSqlDataSourceStrategy,
  ModelDataSourceStrategy as ConstructModelDataSourceStrategy,
} from '../model-datasource-strategy-types';
import { IAmplifyGraphqlDefinition } from '../types';

/**
 * Creates an interface flavor of customSqlDataSourceStrategies from a factory method's schema and data source. Internally, this function
 * scans the fields of `Query` and `Mutation` looking for fields annotated with the `@sql` directive and designates the specified
 * dataSourceStrategy to fulfill those custom queries.
 *
 * Note that we do not scan for `Subscription` fields: `@sql` directives are not allowed on those, and it wouldn't make sense to do so
 * anyway, since subscriptions are processed from an incoming Mutation, not as the result of a direct datasource access.
 */
export const constructCustomSqlDataSourceStrategies = (
  schema: string,
  dataSourceStrategy: ConstructModelDataSourceStrategy,
): ConstructCustomSqlDataSourceStrategy[] => {
  if (!isSqlStrategy(dataSourceStrategy)) {
    return [];
  }

  const parsedSchema = parse(schema);

  const queryNode = parsedSchema.definitions.find(isQueryNode);
  const mutationNode = parsedSchema.definitions.find(isMutationNode);
  if (!queryNode && !mutationNode) {
    return [];
  }

  const customSqlDataSourceStrategies: ConstructCustomSqlDataSourceStrategy[] = [];

  if (queryNode) {
    const fields = fieldsWithSqlDirective(queryNode);
    for (const field of fields) {
      customSqlDataSourceStrategies.push({
        typeName: 'Query',
        fieldName: field.name.value,
        strategy: dataSourceStrategy,
      });
    }
  }

  if (mutationNode) {
    const fields = fieldsWithSqlDirective(mutationNode);
    for (const field of fields) {
      customSqlDataSourceStrategies.push({
        typeName: 'Mutation',
        fieldName: field.name.value,
        strategy: dataSourceStrategy,
      });
    }
  }

  return customSqlDataSourceStrategies;
};

/**
 * Extracts the data source provider from the definition. This jumps through some hoops to avoid changing the public interface. If we decide
 * to change the public interface to simplify the structure, then this process gets a lot simpler.
 */
export const getDataSourceStrategiesProvider = (definition: IAmplifyGraphqlDefinition): DataSourceStrategiesProvider => {
  const provider: DataSourceStrategiesProvider = {
    // We can directly use the interface strategies, even though the SQL strategies have the customSqlStatements field that is unused by the
    // transformer flavor of this type
    dataSourceStrategies: definition.dataSourceStrategies,
    sqlDirectiveDataSourceStrategies: [],
  };

  // We'll collect all the custom SQL statements from the definition into a single map, and use that to make our
  // SqlDirectiveDataSourceStrategies
  const customSqlStatements: Record<string, string> = {};

  const constructSqlStrategies = definition.customSqlDataSourceStrategies ?? [];

  // Note that we're relying on the `customSqlStatements` object reference to stay the same throughout this loop. Don't reassign it, or the
  // collected sqlDirectiveStrategies will break
  constructSqlStrategies.forEach((sqlStrategy) => {
    if (sqlStrategy.strategy.customSqlStatements) {
      Object.assign(customSqlStatements, sqlStrategy.strategy.customSqlStatements);
    }

    provider.sqlDirectiveDataSourceStrategies!.push({
      typeName: sqlStrategy.typeName,
      fieldName: sqlStrategy.fieldName,
      strategy: sqlStrategy.strategy,
      customSqlStatements,
    });
  });

  return provider;
};

/**
 * Validates the user input for the dataSourceStrategy. This is a no-op for DynamoDB strategies for now.
 * @param strategy user provided model data source strategy
 * @returns validates and throws an error if the strategy is invalid
 */
export const validateDataSourceStrategy = (strategy: ConstructModelDataSourceStrategy) => {
  if (!isSqlStrategy(strategy)) {
    return;
  }

  const dbConnectionConfig = strategy.dbConnectionConfig;
  const invalidSSMPaths = Object.values(dbConnectionConfig).filter((value) => typeof value === 'string' && !isValidSSMPath(value));
  if (invalidSSMPaths.length > 0) {
    throw new Error(
      `Invalid data source strategy "${
        strategy.name
      }". Following SSM paths must start with '/' in dbConnectionConfig: ${invalidSSMPaths.join(', ')}.`,
    );
  }
};

const isValidSSMPath = (path: string): boolean => {
  return path.startsWith('/');
};
