import { TransformerSecrets } from '@aws-amplify/graphql-transformer-interfaces';

/**
 * This is the engine type written by the importer into the GraphQL schema, and specified by the customer during the Gen1 CLI import flow.
 */
export enum ImportedRDSType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgres',
}

export type ImportedDataSourceType = ImportedRDSType;

export type ImportedDataSourceConfig = RDSDataSourceConfig;
export type RDSDataSourceConfig = RDSConnectionSecrets & {
  engine: ImportedRDSType;
};

export type ImportAppSyncAPIInputs = {
  apiName: string;
  dataSourceConfig?: ImportedDataSourceConfig;
};

export const SQL_SCHEMA_FILE_NAME = 'schema.sql.graphql';

/** RDSConnectionSecrets is an input type for interactive DB discovery in the Gen 1 CLI import flow, where each value is
 * expected to be the actual value used to connect to the database. TODO: Remove this once we remove SQL support for Gen1 CLI.
 */
export type RDSConnectionSecrets = TransformerSecrets & {
  username: string;
  password: string;
  host: string;
  database: string;
  port: number;
};
