import { URL } from 'url';
import { ImportedRDSType, RDSDataSourceConfig } from '@aws-amplify/graphql-transformer-core';

export const parseDatabaseUrl = (databaseUrl: string): Partial<RDSDataSourceConfig> => {
  try {
    const parsedDatabaseUrl = new URL(databaseUrl);
    const [username, password] = [parsedDatabaseUrl.username, parsedDatabaseUrl.password];
    const database = parsedDatabaseUrl?.pathname?.slice(1);
    const host = parsedDatabaseUrl?.hostname;
    const port = parseInt(parsedDatabaseUrl?.port, 10);
    const engine = parsedDatabaseUrl?.protocol?.slice(0, -1) as ImportedRDSType;

    const config = {
      engine,
      username,
      password,
      database,
      host,
      port,
    };
    return config;
  } catch (err) {
    if (err.code !== 'ERR_INVALID_URL') {
      throw err;
    }
  }
  return {};
};
