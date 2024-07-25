import { pathManager, stateManager } from '@aws-amplify/amplify-cli-core';
import { CfnResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs-extra';
import _ from 'lodash';
import * as path from 'path';
import { getAppSyncAPIName } from '../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { AmplifyApiGraphQlResourceStackTemplate } from './cdk-compat/amplify-api-resource-stack-types';
import { ConstructResourceMeta } from './types/types';
import { convertToAppsyncResourceObj, getStackMeta } from './types/utils';

/**
 *
 * @param scope
 * @param overrideDir
 */
export function applyFileBasedOverride(scope: Construct, overrideDirPath?: string): AmplifyApiGraphQlResourceStackTemplate {
  const overrideDir = overrideDirPath ?? path.join(pathManager.getBackendDirPath(), 'api', getAppSyncAPIName());
  const overrideFilePath = path.join(overrideDir, 'build', 'override.js');
  if (!fs.existsSync(overrideFilePath)) {
    return {};
  }

  const stacks: string[] = [];
  const amplifyApiObj: any = {};
  scope.node.findAll().forEach((node) => {
    const resource = node as CfnResource;
    if (resource.cfnResourceType === 'AWS::CloudFormation::Stack') {
      stacks.push(node.node.id.split('.')[0]);
    }
  });

  scope.node.findAll().forEach((node) => {
    const resource = node as CfnResource;
    let pathArr;
    if (node.node.id === 'Resource') {
      pathArr = node.node.path.split('/').filter((key) => key !== node.node.id);
    } else {
      pathArr = node.node.path.split('/');
    }
    let constructPathObj: ConstructResourceMeta;
    if (resource.cfnResourceType) {
      constructPathObj = getStackMeta(pathArr, node.node.id, stacks, resource);
      if (!_.isEmpty(constructPathObj.rootStack)) {
        // api scope
        const field = constructPathObj.rootStack!.stackType;
        const { resourceName } = constructPathObj;
        _.set(amplifyApiObj, [field, resourceName], resource);
      } else if (!_.isEmpty(constructPathObj.nestedStack)) {
        const fieldType = constructPathObj.nestedStack!.stackType;
        const fieldName = constructPathObj.nestedStack!.stackName;
        const { resourceName } = constructPathObj;
        if (constructPathObj.resourceType.includes('Resolver')) {
          _.set(amplifyApiObj, [fieldType, fieldName, 'resolvers', resourceName], resource);
        } else if (constructPathObj.resourceType.includes('FunctionConfiguration')) {
          _.set(amplifyApiObj, [fieldType, fieldName, 'appsyncFunctions', resourceName], resource);
        } else {
          _.set(amplifyApiObj, [fieldType, fieldName, resourceName], resource);
        }
      }
    }
  });

  const appsyncResourceObj = convertToAppsyncResourceObj(amplifyApiObj);
  const { envName } = stateManager.getLocalEnvInfo();
  const { projectName } = stateManager.getProjectConfig();
  const projectInfo = {
    envName,
    projectName,
  };
  try {
    // TODO: Invoke `runOverride` from CLI core once core refactor is done, and
    // this function can become async https://github.com/aws-amplify/amplify-cli/blob/7bc0b5654a585104a537c1a3f9615bd672435b58/packages/amplify-cli-core/src/overrides-manager/override-runner.ts#L4
    // before importing the override file, we should clear the require cache to avoid
    // importing an outdated version of the override file
    // see: https://github.com/nodejs/modules/issues/307
    // and https://stackoverflow.com/questions/9210542/node-js-require-cache-possible-to-invalidate
    delete require.cache[require.resolve(overrideFilePath)];
    const overrideImport = require(overrideFilePath);
    if (overrideImport && overrideImport?.override && typeof overrideImport?.override === 'function') {
      overrideImport.override(appsyncResourceObj, projectInfo);
    }
  } catch (err) {
    throw new InvalidOverrideError(err);
  }
  return appsyncResourceObj;
}

/**
 *
 */
export class InvalidOverrideError extends Error {
  details: string;

  resolution: string;

  constructor(error: Error) {
    super('Executing overrides failed.');
    this.name = 'InvalidOverrideError';
    this.details = error.message;
    this.resolution = 'There may be runtime errors in your overrides file. If so, fix the errors and try again.';
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, InvalidOverrideError);
    }
  }
}
