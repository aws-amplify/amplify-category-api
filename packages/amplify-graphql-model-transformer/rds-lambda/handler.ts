import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
// @ts-ignore
import { DBAdapter, DBConfig, getDBAdapter } from 'rds-query-processor';

let adapter: DBAdapter;
let secretsClient: SSMClient;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const run = async (event): Promise<any> => {
  if (!adapter) {
    const config = await getDBConfig();
    adapter = await getDBAdapter(config);
  }
  const debugMode = process.env.DEBUG_MODE === 'true';
  const result = await adapter.executeRequest(event, debugMode);
  return result;
};

const createSSMClient = (): void => {
  secretsClient = new SSMClient({});
};

const wait10SecondsAndThrowError = async (): Promise<void> => {
  await delay(10000);
  console.log('Unable to retrieve secret for database connection from SSM. If your database is in VPC, verify that you have VPC endpoints for SSM defined and the security group\'s inbound rule for port 443 is defined.');
  throw new Error('Unable to get the database credentials. Check the logs for more details.');
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
  const data = await Promise.race([secretsClient.send(parameterCommand), wait10SecondsAndThrowError()]);
  if ((data?.$metadata?.httpStatusCode && data?.$metadata?.httpStatusCode >= 400) || !data?.Parameter?.Value) {
    throw new Error('Unable to get secret for database connection');
  }
  return data.Parameter.Value;
};

const getDBConfig = async (): DBConfig => {
  if (!secretsClient) {
    createSSMClient();
  }

  const config = {
    engine: 'mysql',
    host: await getSSMValue(process.env.host),
    port: Number.parseInt(await getSSMValue(process.env.port)) || 3306,
    username: await getSSMValue(process.env.username),
    password: await getSSMValue(process.env.password),
    database: await getSSMValue(process.env.database),
  };

  if (!config.host || !config.port || !config.username || !config.password || !config.database) {
    throw Error('Missing database connection configuration');
  }

  return config;
};
