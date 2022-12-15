import { $TSContext } from 'amplify-cli-core';
import { prompter } from 'amplify-prompts';
import { RDSConnectionSecrets } from '../utils/rds-secrets/database-secrets';

export const getDBUserSecretsWalkthrough = async (context: $TSContext, database: string): Promise<RDSConnectionSecrets> => {
  // Get the database user credentials
  const username = await prompter.input(`Enter the username for ${database} database user:`);
  const password = await prompter.input(`Enter the password for ${database} database user:`);

  return {
    username: username,
    password: password
  };
};
