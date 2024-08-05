import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { getExistingConnectionSecrets, storeConnectionSecrets } from '../../utils/rds-resources/database-resources';

type EnvironmentInfo = {
  isNewEnv: boolean;
  sourceEnv: string;
  yesFlagSet: boolean;
  envName: string;
};

export const configureMultiEnvDBSecrets = async (context: $TSContext, secretsKey: string, apiName: string, envInfo: EnvironmentInfo) => {
  // For existing environments, the secrets are already set in parameter store
  if (!envInfo.isNewEnv) {
    return;
  }

  // For new environments, the secrets are copied over from the source environment.
  const secrets = await getExistingConnectionSecrets(context, secretsKey, apiName, envInfo.sourceEnv);
  if (!secrets) {
    printer.warn(
      `Could not copy over the user secrets for imported database. Run "amplify api update-secrets" to set them for the current environment.`,
    );
    return;
  }

  await storeConnectionSecrets(context, secrets, apiName, secretsKey);
  return;
};
