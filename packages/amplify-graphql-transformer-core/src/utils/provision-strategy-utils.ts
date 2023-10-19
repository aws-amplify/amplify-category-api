import {
  DatasourceProvisionConfig,
  DatasourceProvisionStrategy,
  TransformerBeforeStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';

export function getDatasourceProvisionStratety(
  ctx: TransformerBeforeStepContextProvider,
  typeName: string,
): DatasourceProvisionStrategy | undefined {
  let config: DatasourceProvisionStrategy | undefined;

  const datasourceProvisionConfig = ctx.datasourceProvisionConfig as DatasourceProvisionConfig;
  if (datasourceProvisionConfig && datasourceProvisionConfig.project) {
    config = datasourceProvisionConfig.project;
  }

  const typeConfig = datasourceProvisionConfig?.models?.[typeName];
  if (typeConfig && typeConfig.dbType && typeConfig.provisionStrategy) {
    config = typeConfig;
  }

  return config ?? undefined;
}
