import { DBType, TransformerSecrets } from '@aws-amplify/graphql-transformer-interfaces';

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

// TODO: Fix RDSConnectionSecrets type. It is currently used as both an input type for interactive DB discovery, where each value is
// expected to be the actual value used to connect to the database; and as a configuration holder for the Lambda environment variables,
// where the values are expected to be paths to SSM parameters containing the actual values. Notably, `port` causes type problems since the
// actual value is a number and the path value is a string.
export type RDSConnectionSecrets = TransformerSecrets & {
  username: string;
  password: string;
  host: string;
  database: string;
  port: number;
};

export const MYSQL_DB_TYPE: DBType = 'MySQL';
export const DDB_DB_TYPE: DBType = 'DDB';
export const POSTGRES_DB_TYPE: DBType = 'Postgres';
