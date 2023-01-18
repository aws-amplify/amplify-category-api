import { $TSContext } from 'amplify-cli-core';
import { getDBUserSecretsWalkthrough } from '../../service-walkthroughs/generate-graphql-schema-walkthrough';
import { MySQLDataSourceAdapter, DataSourceAdapter } from '@aws-amplify/graphql-schema-generator';
import { storeConnectionSecrets } from '../../utils/rds-secrets/database-secrets';
import { printer, prompter } from 'amplify-prompts';

type EnvironmentInfo = {
  isNewEnv: boolean,
  sourceEnv: string,
  yesFlagSet: boolean,
  envName: string
};

export const configureMultiEnvDBSecrets = async (context: $TSContext, database: string, envInfo: EnvironmentInfo) => {
  const secretsPrompt = 'You have configured database secrets for your API. How do you want to proceed?';
  const secretsOptions = {

  };
  
};
