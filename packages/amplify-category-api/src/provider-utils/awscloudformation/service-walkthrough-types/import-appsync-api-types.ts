export enum ImportedRDSType {
  MYSQL = 'mysql',
  POSTGRESQL= 'postgresql'
};

export type ImportedDataSourceType = ImportedRDSType;

export type ImportAppSyncAPIInputs =  {
  apiName: string,
  dataSourceType: ImportedDataSourceType
};

export const RDS_SCHEMA_FILE_NAME = 'schema.rds.graphql';
