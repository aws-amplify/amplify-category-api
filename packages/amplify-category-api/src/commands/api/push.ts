import { $TSContext, AmplifyCategories } from '@aws-amplify/amplify-cli-core';

const subcommand = 'push';

export const name = subcommand;

/**
 *
 * @param context
 */
export const run = async (context: $TSContext) => {
  const resourceName = context.parameters.first;
  context.amplify.constructExeInfo(context);
  return context.amplify.pushResources(context, AmplifyCategories.API, resourceName);
};
