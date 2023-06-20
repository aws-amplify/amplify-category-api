import { DatasourceType, RDSConnectionSecrets } from '@aws-amplify/graphql-transformer-core';
import { ConfigWithModelOverride, ExistingDataSource } from '../types';

type DataSourceConfig = {
  modelToDatasourceMap: Map<string, DatasourceType>;
  datasourceSecretParameterLocations: Map<string, RDSConnectionSecrets>;
};

export const parseDataSourceMappings = (
  dataSourceMapping: ConfigWithModelOverride<string> | undefined,
  existingDataSources: Record<string, ExistingDataSource> | undefined,
): DataSourceConfig | undefined => {
  if (!dataSourceMapping || !existingDataSources) {
    return undefined;
  }

  return {
    modelToDatasourceMap: new Map(
      Object.entries(dataSourceMapping.models ?? {}).map(([modelName, dbName]) => {
        const dataSource = existingDataSources[dbName];
        if (!dataSource) {
          throw new Error(`Expected datasource called ${dbName}, was not found`);
        }
        return [modelName, { dbType: dataSource.dbType, provisionDB: dataSource.provisionDB }];
      }),
    ),
    datasourceSecretParameterLocations: new Map(
      Object.entries(existingDataSources).map(([dbName, dataSource]) => [dbName, dataSource.connection]),
    ),
  };
};
