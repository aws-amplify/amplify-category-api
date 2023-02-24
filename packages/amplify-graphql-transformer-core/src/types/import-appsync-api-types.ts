import { TransformerSecrets } from '@aws-amplify/graphql-transformer-interfaces';

export enum ImportedRDSType {
  MYSQL = 'mysql',
  POSTGRESQL= 'postgresql'
};

export type ImportedDataSourceType = ImportedRDSType;

export type ImportedDataSourceConfig = RDSDataSourceConfig;
export type RDSDataSourceConfig = RDSConnectionSecrets & {
  engine: ImportedRDSType
};

export type ImportAppSyncAPIInputs = {
  apiName: string,
  dataSourceConfig: ImportedDataSourceConfig
};

export const RDS_SCHEMA_FILE_NAME = 'schema.rds.graphql';

export type RDSConnectionSecrets = TransformerSecrets & {
  username: string,
  password: string,
  host: string,
  database: string,
  port: number,
};

export const MYSQL_DB_TYPE = 'MySQL';
export const DDB_DB_TYPE = 'DDB';
