import { integer, minLength, printer, prompter } from '@aws-amplify/amplify-prompts';
import { ImportedDataSourceConfig, ImportedDataSourceType, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { parseDatabaseUrl } from '../utils/database-url';

/**
 * Gathers database configuration information
 * @param engine the database engine
 * @returns a promise resolving to the database configuration to be used as an AppSync Data Source
 */
export const databaseConfigurationInputWalkthrough = async (engine: ImportedDataSourceType): Promise<ImportedDataSourceConfig> => {
  const defaultPorts = {
    [ImportedRDSType.MYSQL]: 3306,
    [ImportedRDSType.POSTGRESQL]: 5432,
  };

  printer.info('Please provide the following database connection information:');
  const url = await prompter.input('Enter the database url or host name:', {
    validate: minLength(1),
  });

  let isValidUrl = true;
  const parsedDatabaseUrl = parseDatabaseUrl(url);
  let { host, port, database, username, password } = parsedDatabaseUrl;

  if (!host) {
    isValidUrl = false;
    host = url;
  }
  if (!isValidUrl || !port) {
    port = await prompter.input<'one', number>('Enter the port number:', {
      transform: (input) => Number.parseInt(input, 10),
      validate: integer(),
      initial: defaultPorts[engine] ?? 3306,
    });
  }

  // Get the database user credentials
  if (!isValidUrl || !username) {
    username = await prompter.input('Enter the username:', {
      validate: minLength(1),
    });
  }

  if (!isValidUrl || !password) {
    password = await prompter.input('Enter the password:', { hidden: true, validate: minLength(1) });
  }

  if (!isValidUrl || !database) {
    database = await prompter.input('Enter the database name:', {
      validate: minLength(1),
    });
  }

  return {
    engine,
    database,
    host,
    port,
    username,
    password,
  };
};
