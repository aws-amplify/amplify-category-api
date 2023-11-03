export type DBType = 'MySQL' | 'DDB' | 'Postgres';

export interface DataSourceType {
  dbType: DBType;
  provisionDB: boolean;
}
