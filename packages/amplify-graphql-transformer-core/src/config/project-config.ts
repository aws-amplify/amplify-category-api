export type DBType = 'MySQL' | 'DDB';

export interface DatasourceType {
  dbType: DBType;
  provisionDB: boolean;
}
