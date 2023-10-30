import {
  DatasourceProvisionConfig,
  DatasourceProvisionStrategy,
  TransformerBeforeStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';

/**
 * Get the project-level datasource provision strategy. When typeName is provided, the model level strategy will be fetched
 * @param ctx transfomer before step context
 * @param typeName model name defined in GraphQL schema defintion
 * @returns Datasource provision strategy for the provided model. Undefined if not found
 */
export function getDatasourceProvisionStrategy(
  ctx: TransformerBeforeStepContextProvider,
  typeName?: string,
): DatasourceProvisionStrategy | undefined {
  let config: DatasourceProvisionStrategy | undefined;

  const datasourceProvisionConfig = ctx.datasourceProvisionConfig as DatasourceProvisionConfig;
  if (datasourceProvisionConfig && datasourceProvisionConfig.project) {
    config = datasourceProvisionConfig.project;
  }

  if (typeName) {
    const typeConfig = datasourceProvisionConfig?.models?.[typeName];
    if (typeConfig && typeConfig.dbType && typeConfig.provisionStrategy) {
      config = typeConfig;
    }
  }

  return config ?? undefined;
}
