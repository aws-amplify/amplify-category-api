import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { storeConnectionSecrets, getExistingConnectionSecrets } from '../../utils/rds-secrets/database-secrets';
import { printer } from '@aws-amplify/amplify-prompts';

type EnvironmentInfo = {
  isNewEnv: boolean,
  sourceEnv: string,
  yesFlagSet: boolean,
  envName: string
};

export const configureMultiEnvDBSecrets = async (context: $TSContext, database: string, apiName: string, envInfo: EnvironmentInfo) => {
  // For existing environments, the secrets are already set in parameter store
  if(!envInfo.isNewEnv) {
    return;
  }

  // For new environments, the secrets are copied over from the source environment.
  const secrets = await getExistingConnectionSecrets(context, database, apiName, envInfo.sourceEnv);
  if (!secrets) {
    printer.warn(`Could not copy over the user secrets for database ${database}. Run "amplify api update-secrets" to set them for the current environment.`);
    return;
  }

  await storeConnectionSecrets(context, secrets, apiName);
  return;
};
