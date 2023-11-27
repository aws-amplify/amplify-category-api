import { parse } from 'graphql';
import {
  CustomSqlDataSourceStrategy as ImplementationCustomSqlDataSourceStrategy,
  DataSourceType,
  SQLLambdaModelProvisionStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  dataSourceStrategyToDataSourceType,
  isSqlStrategy,
  isQueryNode,
  isMutationNode,
  fieldsWithSqlDirective,
} from '@aws-amplify/graphql-transformer-core';
import { normalizeDbType } from '@aws-amplify/graphql-transformer-core/lib/utils';
import { CustomSqlDataSourceStrategy as InterfaceCustomSqlDataSourceStrategy, ModelDataSourceStrategy } from '../model-datasource-strategy';

type DataSourceConfig = {
  modelToDatasourceMap: Map<string, DataSourceType>;
};

/**
 * An internal helper to convert from a map of model-to-ModelDataSourceStrategies to the map of model-to-DataSourceTypes that internal
 * transform processing requires. TODO: We can remove this once we refactor the internals to use ModelDataSourceStrategies natively.
 */
export const parseDataSourceConfig = (dataSourceDefinitionMap: Record<string, ModelDataSourceStrategy>): DataSourceConfig => {
  const modelToDatasourceMap = new Map<string, DataSourceType>();
  for (const [key, value] of Object.entries(dataSourceDefinitionMap)) {
    const dataSourceType = dataSourceStrategyToDataSourceType(value);
    modelToDatasourceMap.set(key, dataSourceType);
  }
  return {
    modelToDatasourceMap,
  };
};

/**
 * Creates an interface flavor of customSqlDataSourceStrategies from a factory method's schema and data source. Internally, this function
 * scans the fields of `Query` and `Mutation` looking for fields annotated with the `@sql` directive and designates the specified
 * dataSourceStrategy to fulfill those custom queries.
 *
 * Note that we do not scan for `Subscription` fields: `@sql` directives are not allowed on those, and it wouldn't make sense to do so
 * anyway, since subscriptions are processed from an incoming Mutation, not as the result of a direct datasource access.
 *
 * TODO: Reword this when we refactor to use Strategies throughout the implementation rather than DataSources.
 */
export const constructCustomSqlDataSourceStrategies = (
  schema: string,
  dataSourceStrategy: ModelDataSourceStrategy,
): InterfaceCustomSqlDataSourceStrategy[] => {
  if (!isSqlStrategy(dataSourceStrategy)) {
    return [];
  }

  const parsedSchema = parse(schema);

  const queryNode = parsedSchema.definitions.find(isQueryNode);
  const mutationNode = parsedSchema.definitions.find(isMutationNode);
  if (!queryNode && !mutationNode) {
    return [];
  }

  const customSqlDataSourceStrategies: InterfaceCustomSqlDataSourceStrategy[] = [];

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
 * We currently use a different type structure to model strategies in the interface than we do in the implementation. This maps the
 * interface CustomSqlDataSourceStrategy (which uses SQLLambdaModelDataSourceStrategy) to the implementation flavor (which uses
 * DataSourceType).
 *
 * TODO: Remove this once we refactor the internals to use strategies rather than DataSourceTypes
 */
export const mapInterfaceCustomSqlStrategiesToImplementationStrategies = (
  strategies?: InterfaceCustomSqlDataSourceStrategy[],
): ImplementationCustomSqlDataSourceStrategy[] => {
  if (!strategies) {
    return [];
  }
  return strategies.map((interfaceStrategy) => ({
    fieldName: interfaceStrategy.fieldName,
    typeName: interfaceStrategy.typeName,
    dataSourceType: {
      dbType: normalizeDbType(interfaceStrategy.strategy.dbType),
      provisionDB: false,
      provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
    },
  }));
};
