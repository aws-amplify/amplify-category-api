import { pathManager, stateManager } from '@aws-amplify/amplify-cli-core';
import { getAppSyncResourceName } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { readFromPath } from 'graphql-transformer-core/lib/util/fileUtils';
import { loadConfig, writeConfig } from 'graphql-transformer-core';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Pull all resolver and functions from the current cloud backend and snapshot them in the transform.conf.json file.
 * `amplify pull` may need to be run first.
 */
export const snapshotStackMappings = async (): Promise<void> => {
  const apiName = getAppSyncResourceName(stateManager.getMeta());
  if (!apiName) {
    throw new Error('Could not find api name.');
  }

  const currentApiStacksPath = path.join(pathManager.getCurrentCloudBackendDirPath(), 'api', apiName, 'build', 'stacks');
  if (!fs.pathExistsSync(currentApiStacksPath)) {
    throw new Error('Could not find current cloud backend api stacks path.');
  }

  const apiPath = path.join(pathManager.getAmplifyDirPath(), 'backend', 'api', apiName);
  if (!fs.pathExistsSync(apiPath)) {
    throw new Error('Could not find api path.');
  }

  const currentApiStacks: Record<string, string> = await readFromPath(currentApiStacksPath);

  const getResourceIdsForTypes = (stackDefinition: any, resourceTypes: string[]): string[] => {
    const resourceTypeSet = new Set(resourceTypes);
    return Object.entries(stackDefinition.Resources)
      .filter(([_, resource]: [string, any]) => resourceTypeSet.has(resource.Type))
      .map(([resourceName, _]) => resourceName);
  };

  const stackMappings = Object.fromEntries(Object.entries(currentApiStacks).flatMap(([stackFileName, stackContentsString]) => {
    const stackName = stackFileName.split('.')[0];
    const stackContents = JSON.parse(stackContentsString);
    return getResourceIdsForTypes(stackContents, ['AWS::AppSync::FunctionConfiguration', 'AWS::AppSync::Resolver'])
      .map(id => [id, stackName]);
  }));

  const config: any = await loadConfig(apiPath);

  Object.entries(stackMappings).forEach(([resourceId, stackName]) => {
    if (!config.StackMapping) {
      config.StackMapping = {};
    }
    if (!(resourceId in config.StackMapping)) {
      config.StackMapping[resourceId] = stackName;
    }
  });

  await writeConfig(apiPath, config);
};

/**
 * Pull all resolver and functions from the current cloud backend and snapshot them in the transform.conf.json file.
 * `amplify pull` may need to be run first.
 */
export const assignStackMappings = async (stackNameAssignment: string): Promise<void> => {
  await snapshotStackMappings();

  const apiName = getAppSyncResourceName(stateManager.getMeta());
  if (!apiName) {
    throw new Error('Could not find api name.');
  }

  const apiPath = path.join(pathManager.getAmplifyDirPath(), 'backend', 'api', apiName);
  if (!fs.pathExistsSync(apiPath)) {
    throw new Error('Could not find api path.');
  }

  const buildApiStacksPath = path.join(apiPath, 'build', 'stacks');
  if (!fs.pathExistsSync(buildApiStacksPath)) {
    throw new Error('need to build first, run `amplify api gql-compile`');
  }

  const apiStacks: Record<string, string> = await readFromPath(buildApiStacksPath);

  const getResourceIdsForTypes = (stackDefinition: any, resourceTypes: string[]): string[] => {
    const resourceTypeSet = new Set(resourceTypes);
    return Object.entries(stackDefinition.Resources)
      .filter(([_, resource]: [string, any]) => resourceTypeSet.has(resource.Type))
      .map(([resourceName, _]) => resourceName);
  };

  const stackMappings = Object.fromEntries(Object.entries(apiStacks).flatMap(([stackFileName, stackContentsString]) => {
    const stackName = stackFileName.split('.')[0];
    const stackContents = JSON.parse(stackContentsString);
    return getResourceIdsForTypes(stackContents, ['AWS::AppSync::FunctionConfiguration', 'AWS::AppSync::Resolver'])
      .map(id => [id, stackName]);
  }));

  const config: any = await loadConfig(apiPath);

  Object.entries(stackMappings).forEach(([resourceId, stackName]) => {
    if (!config.StackMapping) {
      config.StackMapping = {};
    }
    if (!(resourceId in config.StackMapping)) {
      config.StackMapping[resourceId] = stackNameAssignment;
    }
  });

  await writeConfig(apiPath, config);
};
