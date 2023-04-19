import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { isDataStoreEnabled as isDataStoreEnabledAtDirectory } from 'graphql-transformer-core';
import { contextUtil } from './context-util';

/**
 * Given an input Amplify context retrieve the resource directory (we use forceCompile in order to check unchanged packages as well)
 * and return whether or not the customer has conflict resolution enabled on their project.
 * @param context the amplify context to extract project directories from
 * @returns true if customer has conflict resolution enabled on their project
 */
export const isDataStoreEnabled = async (context: $TSContext): Promise<boolean> => {
  const resourceDirectory = await contextUtil.getResourceDir(context, { forceCompile: true });
  return isDataStoreEnabledAtDirectory(resourceDirectory);
};
