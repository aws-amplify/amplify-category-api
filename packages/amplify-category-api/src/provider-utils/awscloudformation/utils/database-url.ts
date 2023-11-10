import { URL } from 'url';
import { AmplifyError } from '@aws-amplify/amplify-cli-core';
import { ImportedRDSType, ImportedDataSourceConfig } from 'graphql-transformer-common';

export const parseDatabaseUrl = (databaseUrl: string): Partial<ImportedDataSourceConfig> => {
  const allowedProtocols = ['mysql', 'mysql2'];
  try {
    const parsedDatabaseUrl = new URL(databaseUrl);
    const { username, password, hostname: host } = parsedDatabaseUrl;
    const database = parsedDatabaseUrl?.pathname?.slice(1);
    const port = parseInt(parsedDatabaseUrl?.port, 10);
    const engine = parsedDatabaseUrl?.protocol?.slice(0, -1) as ImportedRDSType;

    const isValidEngine = allowedProtocols.includes(engine);
    if (!isValidEngine) {
      throw new AmplifyError('InputValidationError', {
        message: `Invalid engine ${engine}.`,
      });
    }

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
