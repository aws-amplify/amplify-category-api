import { ImportedRDSType, MYSQL_DB_TYPE, POSTGRES_DB_TYPE, normalizeDbType } from 'graphql-transformer-common';

export const dbTypeToImportedRDSType = (dbType: string): ImportedRDSType => {
  switch (normalizeDbType(dbType)) {
    case MYSQL_DB_TYPE:
      return ImportedRDSType.MYSQL;
    case POSTGRES_DB_TYPE:
      return ImportedRDSType.POSTGRESQL;
    default:
      throw new Error(`Unsupported database engine type ${dbType}`);
  }
};
