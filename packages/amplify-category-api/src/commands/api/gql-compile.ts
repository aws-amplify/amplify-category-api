import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { forceRefreshSchema } from '../../force-updates/force-refresh-schema';

const subcommand = 'gql-compile';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  if (context?.input?.options?.force) {
    forceRefreshSchema();
  }
  return context.amplify.executeProviderUtils(context, 'awscloudformation', 'compileSchema', { forceCompile: true });
};
