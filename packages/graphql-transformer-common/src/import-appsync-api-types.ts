// Types in this file represent the values discovered during the CLI `amplify import api` flow

/**
 * The database engine type as recorded in the generated GraphQL schema. This type is only used for the walkthrough and schema generation
 * flows. The transformer internals use the ModelDataSourceDbType.
 *
 * This enum should not be exported to the category API.
 */
export enum ImportedRDSType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgres',
}

export type ImportedDataSourceConfig = {
  database: string;
  engine: ImportedRDSType;
  host: string;
  password: string;
  port: number;
  username: string;
};

export type ImportAppSyncAPIInputs = {
  apiName: string;
  dataSourceConfig?: ImportedDataSourceConfig;
};
