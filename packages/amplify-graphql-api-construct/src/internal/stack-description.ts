import { Construct } from 'constructs';
import * as os from 'os';
import { getStackForScope } from './node-traversal';

/**
 * Compute the platform string, based on
 * https://github.com/aws-amplify/amplify-cli/blob/88da2c9fca04d6ce734b078868d02c110db7d6a3/packages/amplify-provider-awscloudformation/src/template-description-utils.ts#L60-L70
 * @returns the platform string
 */
const getPlatformString = (): string => {
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

/**
 * Compute the bi-metadata string to embed somewhere in the stack
 * @returns the metadata string to compute amplify attribution
 */
const getAttributionMetadata = (): Record<string, any> => ({
  createdOn: getPlatformString(),
  createdBy: 'Amplify',
  createdWith: '0.3.3',
  stackType: 'api-AppSync',
  metadata: {
    isCdk: true,
  },
});

/**
 * Overwrite the stack description with the amplify metadata
 * @param scope the scope we will use to append metadata
 */
export const overwriteStackDescriptionWithAmplifyMetadata = (scope: Construct): void => {
  getStackForScope(scope).templateOptions.description = JSON.stringify(getAttributionMetadata());
};
