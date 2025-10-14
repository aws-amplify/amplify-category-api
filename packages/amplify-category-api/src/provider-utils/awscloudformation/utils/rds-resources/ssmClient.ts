import { $TSContext } from '@aws-amplify/amplify-cli-core';
import {
  DeleteParameterCommand,
  GetParametersByPathCommand,
  DeleteParametersCommand,
  GetParametersCommand,
  PutParameterCommand,
  SSMClient as SSM_Client,
} from '@aws-sdk/client-ssm';

export type Secret = {
  secretName: string;
  secretValue: string;
};

/**
 *  SSM client provider for AWS SDK calls
 */
export class SSMClient {
  private static instance: SSMClient;

  static getInstance = async (context: $TSContext): Promise<SSMClient> => {
    if (!SSMClient?.instance) {
      SSMClient.instance = new SSMClient(await getSSMClient(context));
    }
    return SSMClient.instance;
  };

  private constructor(private readonly ssmClient: SSM_Client) {}

  /**
   * Returns a list of secret name value pairs
   */
  getSecrets = async (secretNames: string[]): Promise<Secret[]> => {
    if (!secretNames || secretNames?.length === 0) {
      return [];
    }
    const result = await this.ssmClient.send(
      new GetParametersCommand({
        Names: secretNames,
        WithDecryption: true,
      }),
    );

    return result ? result?.Parameters?.map(({ Name, Value }) => ({ secretName: Name, secretValue: Value })) : [];
  };

  /**
   * Returns all secret names under a path. Does NOT decrypt any secrets
   */
  getSecretNamesByPath = async (secretPath: string): Promise<string[]> => {
    let nextToken: string | undefined;
    const secretNames: string[] = [];
    do {
      const result = await this.ssmClient.send(
        new GetParametersByPathCommand({
          Path: secretPath,
          MaxResults: 10,
          ParameterFilters: [
            {
              Key: 'Type',
              Option: 'Equals',
              Values: ['SecureString'],
            },
          ],
          NextToken: nextToken,
        }),
      );
      secretNames.push(...result?.Parameters?.map((param) => param?.Name));
      nextToken = result?.NextToken;
    } while (nextToken);
    return secretNames;
  };

  /**
   * Sets the given secretName to the secretValue. If secretName is already present, it is overwritten.
   */
  setSecret = async (secretName: string, secretValue: string): Promise<void> => {
    await this.ssmClient.send(
      new PutParameterCommand({
        Name: secretName,
        Value: secretValue,
        Type: 'SecureString',
        Overwrite: true,
      }),
    );
  };

  /**
   * Deletes secretName. If it already doesn't exist, this is treated as success. All other errors will throw.
   */
  deleteSecret = async (secretName: string): Promise<void> => {
    try {
      await this.ssmClient.send(new DeleteParameterCommand({ Name: secretName }));
    } catch (err) {
      if (err?.name !== 'ParameterNotFound') {
        // if the value didn't exist in the first place, consider it deleted
        throw err;
      }
    }
  };

  /**
   * Deletes all secrets in secretNames.If secret doesn't exist, this is treated as success. All other errors will throw.
   */
  deleteSecrets = async (secretNames: string[]): Promise<void> => {
    try {
      await this.ssmClient.send(new DeleteParametersCommand({ Names: secretNames }));
    } catch (err) {
      // if the value didn't exist in the first place, consider it deleted
      if (err?.name !== 'ParameterNotFound') {
        throw err;
      }
    }
  };
}

// The Provider plugin holds all the configured service clients. Fetch from there.
const getSSMClient = async (context: $TSContext): Promise<SSM_Client> => {
  const { client } = (await context.amplify.invokePluginMethod(context, 'awscloudformation', undefined, 'getConfiguredSSMClient', [
    context,
  ])) as any;
  return client;
};
