import {
  DataSourceProvisionStrategy,
  DynamoDBProvisionStrategy,
  TransformerBeforeStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';

/**
 * Get the project-level datasource provision strategy. When typeName is provided, the model level strategy will be fetched
 * @param ctx transfomer before step context
 * @param typeName model name defined in GraphQL schema defintion
 * @returns Datasource provision strategy for the provided model.
 */
export function getDatasourceProvisionStrategy(ctx: TransformerBeforeStepContextProvider, typeName?: string): DataSourceProvisionStrategy {
  let config: DataSourceProvisionStrategy = DynamoDBProvisionStrategy.DEFAULT;

  if (typeName) {
    const typeConfig = ctx.modelToDatasourceMap.get(typeName);
    if (typeConfig && typeConfig.dbType && typeConfig.provisionStrategy) {
      config = typeConfig.provisionStrategy;
    }
  }
  return config;
}
