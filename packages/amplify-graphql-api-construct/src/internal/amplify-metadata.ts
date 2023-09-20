import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
/**
 * Given a scope, search up for the parent stack. This should be the nearest stack object.
 * @param scope the scope to search up against.
 * @returns the stack, if one can be found, else throws an error.
 */
const getStackForScope = (scope: Construct): Stack => {
  const stacksInHierarchy = scope.node.scopes.filter((parentScope) => 'templateOptions' in parentScope);
  if (stacksInHierarchy.length === 0) {
    throw new Error('No Stack Found in Construct Scope');
  }
  return stacksInHierarchy.reverse()[0] as Stack;
};

/**
 * Compute the platform string, based on
 * https://github.com/aws-amplify/amplify-cli/blob/88da2c9fca04d6ce734b078868d02c110db7d6a3/packages/amplify-provider-awscloudformation/src/template-description-utils.ts#L60-L70
 * @returns the platform string
 */
const getPlatform = (): string => {
  switch (os.platform()) {
    case 'darwin':
      return 'Mac';
    case 'win32':
      return 'Windows';
    case 'linux':
      return 'Linux';
    default:
      return 'Other';
  }
};

const getLibraryVersion = (): string => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('Could not load determine library version for metadata generation.');
  }
  const packageJsonContents = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const libraryVersion = packageJsonContents.version;
  if (!libraryVersion) {
    throw new Error('Library version could not be read from package json for metadata generation.');
  }
  return libraryVersion;
};

/**
 * Compute the bi-metadata string to embed somewhere in the stack
 * @returns the metadata string to compute amplify attribution
 */
const getAttributionMetadata = (): Record<string, string> => ({
  createdOn: getPlatform(),
  createdBy: 'AmplifyCDK',
  createdWith: getLibraryVersion(),
  stackType: 'graphql-api',
});

/**
 * If possible, attach the stack description to the parent stack.
 * @param scope the scope we will use to append metadata
 */
export const addAmplifyMetadataToStackDescription = (scope: Construct): void => {
  const stack = getStackForScope(scope);
  if (!stack.templateOptions.description || stack.templateOptions.description === '') {
    stack.templateOptions.description = JSON.stringify(getAttributionMetadata());
  }
};
