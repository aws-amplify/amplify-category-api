export type DBType = 'MySQL' | 'DDB' | 'Postgres';

export interface DatasourceType {
  dbType: DBType;
  provisionDB: boolean;
}
