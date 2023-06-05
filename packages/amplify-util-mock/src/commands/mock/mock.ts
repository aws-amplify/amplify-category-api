import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { mockAllCategories } from '../../mockAll';
import { run as runHelp } from './help';

export const name = 'mock';

/**
 *
 * @param context
 */
export const run = (context: $TSContext) => {
  if (context.parameters.options.help) {
    return runHelp(context);
  }
  mockAllCategories(context);
};
