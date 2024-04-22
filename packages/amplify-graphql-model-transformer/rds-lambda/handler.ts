import { SSMClient, GetParameterCommand, GetParameterCommandOutput } from '@aws-sdk/client-ssm';
import { GetSecretValueCommand, SecretsManagerClient, GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';
// @ts-ignore
import { DBAdapter, DBConfig, getDBAdapter } from 'rds-query-processor';

let adapter: DBAdapter;
let ssmClient: SSMClient;
let secretsManagerClient: SecretsManagerClient;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const WAIT_COMPLETE = 'WAIT_COMPLETE';

/**
 * This must match enum in src/resolvers/rds/resolver.ts
 */
enum CredentialStorageMethod {
  SSM = 'SSM',
  SECRETS_MANAGER = 'SECRETS_MANAGER',
}

export const run = async (event): Promise<any> => {
  if (!adapter) {
    const config = await getDBConfig();
    adapter = await getDBAdapter(config);
  }
  const debugMode = process.env.DEBUG_MODE === 'true';
  try {
    return await adapter.executeRequest(event, debugMode);
  } catch (e) {
    if (isRetryableError(e)) {
      return await retryWithRefreshedCredentials(event, debugMode)
    }
    throw e;
  }
};

const retryWithRefreshedCredentials = async (event, debugMode): Promise<any> => {
  try {
    const config = await getDBConfig();
    adapter = await getDBAdapter(config);
    return await adapter.executeRequest(event, debugMode);
  } catch (err) {
    adapter = null;
    throw err;
  }
};

const isRetryableError = (error): boolean => {
  // https://www.postgresql.org/docs/current/errcodes-appendix.html
  const postgresRetryableError = error.code === '28P01';

  // https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
  const mysqlRetryableError = error.errno === '1045';

  return postgresRetryableError || mysqlRetryableError;
}

const createSSMClient = (): void => {
  const PORT_SEPERATOR = ':';
  const endpoint = process.env.SSM_ENDPOINT?.split(PORT_SEPERATOR).pop();
  ssmClient = new SSMClient({
    endpoint: `https://${endpoint}`,
  });
};

const createSecretsManagerClient = (): void => {
  const PORT_SEPERATOR = ':';
  const endpoint = process.env.SECRETS_MANAGER_ENDPOINT?.split(PORT_SEPERATOR).pop();
  secretsManagerClient = new SecretsManagerClient({
    endpoint: `https://${endpoint}`,
  });
};


const wait10Seconds = async (): Promise<string> => {
  await delay(10000);
  return WAIT_COMPLETE;
};

const getSSMValue = async (key: string | undefined): Promise<string> => {
  if (!key) {
    throw Error('Key not provided to retrieve database connection secret');
  }
  const parameterCommand = new GetParameterCommand({
    Name: key,
    WithDecryption: true,
  });

  // When the lambda is deployed in VPC and VPC endpoints for SSM are not defined or
  // the security group's inbound rule for port 443 is not defined,
  // the SSM client waits for the entire lambda execution time and times out.
  // If the parameter is not retrieved within 10 seconds, throw an error.
  const data = await Promise.race([ssmClient.send(parameterCommand), wait10Seconds()]);

  // If string is returned, throw error.
  if (
    (typeof data === 'string' || data instanceof String) &&
    data === WAIT_COMPLETE
  ) {
    console.log('Unable to retrieve secret for database connection from SSM. If your database is in VPC, verify that you have VPC endpoints for SSM defined and the security group\'s inbound rule for port 443 is defined.');
    throw new Error('Unable to get the database credentials. Check the logs for more details.');
  }

  // Read the value from the GetParameter response.
  const response = data as GetParameterCommandOutput;
  if ((response?.$metadata?.httpStatusCode && response?.$metadata?.httpStatusCode >= 400) || !response?.Parameter?.Value) {
    throw new Error('Unable to get secret for database connection');
  }
  return response.Parameter.Value;
};

const getSecretManagerValue = async (secretArn: string | undefined): Promise<{ username: string, password: string}> => {
  if (!secretArn) {
    throw Error('Secret ARN not provided to retrieve database connection secret');
  }
  const secretValueCommand = new GetSecretValueCommand({ SecretId: secretArn });
  // When the lambda is deployed in VPC and VPC endpoints for secrets manager are not defined or
  // the security group's inbound rule for port 443 is not defined,
  // the secrets manager client waits for the entire lambda execution time and times out.
  // If the parameter is not retrieved within 10 seconds, throw an error.
  const data = await Promise.race([secretsManagerClient.send(secretValueCommand), wait10Seconds()]);

  if (
    (typeof data === 'string' || data instanceof String) &&
    data === WAIT_COMPLETE
  ) {
    console.log('Unable to retrieve secret for database connection from Secrets Manager. If your database is in VPC, verify that you have VPC endpoints for Secrets Manager defined and the security group\'s inbound rule for port 443 is defined.');
    throw new Error('Unable to get the database credentials. Check the logs for more details.');
  }

  const response = data as GetSecretValueCommandOutput;
  if ((response?.$metadata?.httpStatusCode && response?.$metadata?.httpStatusCode >= 400) || !response.SecretString) {
    throw new Error('Unable to get secret for database connection');
  }

  try {
    const secrets = JSON.parse(response.SecretString);
    if (!secrets.username || !secrets.password) {
      throw new Error('Unable to get secret for database connection');
    }
    return secrets;
  } catch {
    throw new Error('Unable to get secret for database connection');
  }
}

const resolveConnectionStringValue = async (jsonConnectionString: string): Promise<string> => {
  const parsedJsonConnectionString = JSON.parse(jsonConnectionString);
  const ssmRequestError = 'Unable to connect to the database. Check the logs for more details.';
  const ssmLoggedError = 'Unable to fetch the connection Uri from SSM for the provided paths.';
  if (Array.isArray(parsedJsonConnectionString)) {
    for (const connectionUriSsmPath of parsedJsonConnectionString) {
      try {
        return await getSSMValue(connectionUriSsmPath);
      }
      catch (e) {
        // try the next secret path;
        continue;
      }
    }
    console.log(ssmLoggedError);
    throw new Error(ssmRequestError);
  }
  else {
    try {
      return await getSSMValue(parsedJsonConnectionString);
    }
    catch (e) {
      console.log(ssmLoggedError);
      throw new Error(ssmRequestError);
    }
  }
};


const getDBConfig = async (): DBConfig => {
  const config: DBConfig = {};
  const credentialStorageMethod = process.env.CREDENTIAL_STORAGE_METHOD;
  if (credentialStorageMethod === CredentialStorageMethod.SSM) {
    if (!ssmClient) {
      createSSMClient();
    }

    const jsonConnectionString = process.env.connectionString;
    if (jsonConnectionString) {
      config.connectionString = await resolveConnectionStringValue(jsonConnectionString);
      return config;
    }

    config.engine = getDBEngine(),
    config.host = await getSSMValue(process.env.host);
    config.port = Number.parseInt(await getSSMValue(process.env.port)) || 3306;
    config.username = await getSSMValue(process.env.username);
    config.password = await getSSMValue(process.env.password);
    config.database = await getSSMValue(process.env.database);
  } else if (credentialStorageMethod === CredentialStorageMethod.SECRETS_MANAGER) {
    if (!secretsManagerClient) {
      createSecretsManagerClient();
    }

    config.engine = getDBEngine();
    config.port = Number.parseInt(process.env.port || '3306');
    config.database = process.env.database;
    config.host = process.env.host;


    const secrets = await getSecretManagerValue(process.env.secretArn);
    config.username = secrets.username;
    config.password = secrets.password;
  } else {
    throw new Error('Unable to determine credentials storage method (SSM or SECRETS_MANAGER).');
  }

  if (!config.host || !config.port || !config.username || !config.password || !config.database) {
    throw Error('Missing database connection configuration');
  }

  return config;
};

const getDBEngine = (): string => {
  if (!process.env.engine) {
    throw Error('Missing database engine configuration');
  }
  return process.env.engine;
};
