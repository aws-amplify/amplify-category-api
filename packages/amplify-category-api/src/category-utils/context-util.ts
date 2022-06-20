import {
  $TSAny,
  $TSContext,
  AmplifyCategories,
  pathManager,
} from 'amplify-cli-core';
import path from 'path';
import { PROVIDER_NAME } from '../graphql-transformer/constants';

/**
 * ContextUtil
 * Some values are calculated on the basis of the context and options that come
 * from the Amplify CLI, this class/singleton help calculate and cache those values
 * for reference
 */
export class ContextUtil {
  private resourceDir: string;

  /**
   * Get the resource directory as used by the API category for GraphQL
   * @param context the context from the CLI
   * @param options the options from the CLI
   */
  getResourceDir = async (
    context: $TSContext,
    options: $TSAny,
  ): Promise<string> => {
    if (this.resourceDir) {
      return this.resourceDir;
    }
    let { resourceDir } = options;
    const backEndDir = pathManager.getBackendDirPath();
    const { resourcesToBeCreated, resourcesToBeUpdated } = await context.amplify.getResourceStatus(AmplifyCategories.API);
    const resources = resourcesToBeCreated.concat(resourcesToBeUpdated);
    if (!resourceDir) {
      // There can only be one appsync resource
      if (resources.length > 0) {
        const resource = resources[0];
        if (resource.providerPlugin !== PROVIDER_NAME) {
          return undefined;
        }
        const { category } = resource;
        const { resourceName } = resource;
        resourceDir = path.normalize(path.join(backEndDir, category, resourceName));
      } else {
        // No appsync resource to update/add
        return undefined;
      }
    }
    this.resourceDir = resourceDir;
    return resourceDir;
  }
}

export const contextUtil = new ContextUtil();
