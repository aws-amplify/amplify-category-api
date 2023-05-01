import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
// @ts-ignore
import { DBAdapter, DBConfig, getDBAdapter } from 'rds-query-processor';

let adapter: DBAdapter;
let secretsClient: SSMClient;

export const run = async (event): Promise<any> => {
  if (!adapter) {
    const config = await getDBConfig();
    adapter = await getDBAdapter(config);
  }
  const result = await adapter.executeRequest(event);
  return result;
};

const createSSMClient = (): void => {
  secretsClient = new SSMClient({});
}

const getSSMValue = async(key: string | undefined): Promise<string> => {
  if (!key) {
    throw Error('Key not provided to retrieve database connection secret');
  }
  const parameterCommand = new GetParameterCommand({
    Name: key,
    WithDecryption: true,
  });
  const data = await secretsClient.send(parameterCommand);
  if ((data.$metadata?.httpStatusCode && data?.$metadata?.httpStatusCode >= 400) || !data.Parameter?.Value) {
    throw new Error('Unable to get secret for database connection');
  }
  return data.Parameter?.Value ?? '';
}

const getDBConfig = async(): DBConfig  => {
  if (!secretsClient) {
    createSSMClient();
  }

  return {
    engine: 'mysql',
    host: await getSSMValue(process.env.host),
    port: Number.parseInt(await getSSMValue(process.env.port)) || 3306,
    username: await getSSMValue(process.env.username),
    password: await getSSMValue(process.env.password),
    database: await getSSMValue(process.env.database),
  };
}
