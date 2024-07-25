import { JSONUtilities } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { TransformConfig } from '@aws-amplify/graphql-transformer-core/lib';
import * as fs from 'fs-extra';
import { ResourceConstants } from 'graphql-transformer-common';
import { TRANSFORM_CONFIG_FILE_NAME } from 'graphql-transformer-core';
import * as path from 'path';

/**
 * Return whether or not NodeToNodeEncryption should be enabled for the API.
 * If an explicit value is set in the api configuration by the user, apply that value.
 * If the #current-cloud-backend has it enabled in any stack, then leave it enabled.
 * Else leave it disabled.
 * @param projectDir the root directory for the project.
 * @param apiName the name of the api to attempt and pull the flag from.
 * @returns whether or not NodeToNodeEncryption should be enabled on a searchable instance as well as any warning message.
 */
export const shouldEnableNodeToNodeEncryption = (apiName: string, projectRoot: string, currentCloudBackendDir: string): boolean => {
  try {
    const nodeToNodeEncryptionParameter = getNodeToNodeEncryptionConfigValue(projectRoot, apiName);
    const doesExistingBackendHaveNodeToNodeEncryption = getCurrentCloudBackendStackFiles(currentCloudBackendDir, apiName).some(
      (definition) => hasNodeToNodeEncryptionOptions(definition),
    );

    warnOnExistingNodeToNodeEncryption(doesExistingBackendHaveNodeToNodeEncryption);

    if (nodeToNodeEncryptionParameter !== undefined) {
      return nodeToNodeEncryptionParameter;
    }

    return doesExistingBackendHaveNodeToNodeEncryption;
  } catch (e) {
    // Fail open, and don't set the flag for the purposes of this workaround phase.
    return false;
  }
};

const warnOnExistingNodeToNodeEncryption = (doesExistingBackendHaveNodeToNodeEncryption: boolean): void => {
  if (!doesExistingBackendHaveNodeToNodeEncryption) {
    return;
  }

  printer.warn(`
NodeToNodeEncryption is enabled for this Search Domain, disabling this flag or reverting to Amplify CLI <= 10.5.2 will result in this being disabled, triggering a rebuild of the Search Index. To backfill your search domain see https://docs.amplify.aws/cli/graphql/troubleshooting/#backfill-opensearch-index-from-dynamodb-table.
`);
};

const getCurrentCloudBackendStackFiles = (currentCloudBackendDir: string, apiName: string): any[] => {
  const backendPath = path.join(currentCloudBackendDir, 'api', apiName, 'build', 'stacks');
  try {
    return fs.readdirSync(backendPath).map((stackFile) => JSONUtilities.readJson<any>(path.join(backendPath, stackFile)));
  } catch (e) {
    return [];
  }
};

/**
 * Given a Stack file, determine whether or not NodeToNodeEncryption is defined in a search domain
 * @param stackDefinition the stack to inspect
 * @returns whether or not NodeToNodeEncryption was found, else false
 */
export const hasNodeToNodeEncryptionOptions = (stackDefinition: any): boolean => {
  try {
    const domain = stackDefinition['Resources'][ResourceConstants.RESOURCES.OpenSearchDomainLogicalID];
    const nodeToNodeEncryptionOption = domain['Properties']['NodeToNodeEncryptionOptions']['Enabled'];
    return nodeToNodeEncryptionOption === true;
  } catch (e) {}
  return false;
};

const getNodeToNodeEncryptionConfigValue = (projectRoot: string, apiName: string): boolean | undefined => {
  const configPath = projectRoot ? path.join(projectRoot, 'amplify', 'backend', 'api', apiName, TRANSFORM_CONFIG_FILE_NAME) : undefined;
  if (configPath && fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as TransformConfig;
    return config.NodeToNodeEncryption;
  }
  return undefined;
};
