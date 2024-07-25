import path from 'path';
import { $TSContext, AmplifyCategories, pathManager } from '@aws-amplify/amplify-cli-core';

import fs from 'fs-extra';
import { PROVIDER_NAME } from '../graphql-transformer/constants';

export const APPSYNC_RESOURCE_SERVICE = 'AppSync';

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
  getResourceDir = async (context: $TSContext, options: any): Promise<string> => {
    if (this.resourceDir) {
      return this.resourceDir;
    }
    let { resourceDir } = options;
    const { forceCompile } = options;
    const backEndDir = pathManager.getBackendDirPath();
    const { resourcesToBeCreated, resourcesToBeUpdated, allResources } = await context.amplify.getResourceStatus(AmplifyCategories.API);
    let resources = resourcesToBeCreated.concat(resourcesToBeUpdated);

    // When build folder is missing include the API
    // to be compiled without the backend/api/<api-name>/build
    // cloud formation push will fail even if there is no changes in the GraphQL API
    // https://github.com/aws-amplify/amplify-console/issues/10
    const resourceNeedCompile = allResources
      .filter((r) => !resources.includes(r))
      .filter((r) => {
        const buildDir = path.normalize(path.join(backEndDir, AmplifyCategories.API, r.resourceName, 'build'));
        return !fs.existsSync(buildDir);
      });
    resources = resources.concat(resourceNeedCompile);

    if (forceCompile) {
      resources = resources.concat(allResources);
    }
    resources = resources.filter((resource) => resource.service === APPSYNC_RESOURCE_SERVICE);
    if (!resourceDir) {
      // There can only be one appsync resource
      if (!resources.length) {
        // No appsync resource to update/add
        return undefined;
      }
      if (resources.length > 0) {
        const resource = resources[0];
        if (resource.providerPlugin !== PROVIDER_NAME) {
          return undefined;
        }
        const { category } = resource;
        const { resourceName } = resource;
        resourceDir = path.normalize(path.join(backEndDir, category, resourceName));
      }
    }
    this.resourceDir = resourceDir;
    return resourceDir;
  };
}

export const contextUtil = new ContextUtil();
