import { $TSContext, AmplifyCategories, stateManager } from '@aws-amplify/amplify-cli-core';
import { ensureEnvParamManager } from '@aws-amplify/amplify-environment-parameters';
import _ from 'lodash';
import { GRAPHQL_API_ENDPOINT_OUTPUT, GRAPHQL_API_KEY_OUTPUT, MOCK_API_KEY, MOCK_API_PORT } from '../../api/api';

/**
 * Loads all parameters that should be passed into the lambda CFN template when resolving values
 *
 * Iterates through a list of parameter getters. If multiple getters return the same key, the latter will overwrite the former
 */
export const populateCfnParams = async (
  print: $TSContext['print'],
  resourceName: string,
  overrideApiToLocal: boolean = false,
): Promise<Record<string, string>> => {
  const cfnParams = [getCfnPseudoParams, getAmplifyMetaParams, getParametersJsonParams]
    .map((paramProvider) => paramProvider(print, resourceName, overrideApiToLocal))
    .reduce((acc, it) => ({ ...acc, ...it }), {});

  const resourceParamManager = (await ensureEnvParamManager()).instance.getResourceParamManager(AmplifyCategories.API, resourceName);
  return { ...cfnParams, ...resourceParamManager.getAllParams() };
};

const getCfnPseudoParams = (): Record<string, string> => {
  const env = stateManager.getLocalEnvInfo().envName;
  const meta = stateManager.getMeta();
  const region = _.get(meta, ['awscloudformation', 'Region'], 'us-test-1');
  const stackId = _.get(meta, ['awscloudformation', 'StackId'], 'fake-stack-id');
  const stackName = _.get(meta, ['awscloudformation', 'StackName'], 'local-testing');
  const accountIdMatcher = /arn:aws:cloudformation:.+:(?<accountId>\d+):stack\/.+/;
  const match = accountIdMatcher.exec(stackId);
  const accountId = match ? match.groups.accountId : '12345678910';
  return {
    env,
    'AWS::Region': region,
    'AWS::AccountId': accountId,
    'AWS::StackId': stackId,
    'AWS::StackName': stackName,
    'AWS::URLSuffix': 'amazonaws.com',
  };
};

/**
 * Loads CFN parameters by matching the dependsOn field of the resource with the CFN outputs of other resources in the project
 */
const getAmplifyMetaParams = (
  print: $TSContext['print'],
  resourceName: string,
  overrideApiToLocal: boolean = false,
): Record<string, string> => {
  const projectMeta = stateManager.getMeta();
  if (!Array.isArray(projectMeta?.function?.[resourceName]?.dependsOn)) {
    return {};
  }
  const dependencies = projectMeta?.function?.[resourceName]?.dependsOn as {
    category: string;
    resourceName: string;
    attributes: string[];
  }[];
  return dependencies.reduce((acc, dependency) => {
    dependency.attributes.forEach((attribute) => {
      let val = projectMeta?.[dependency.category]?.[dependency.resourceName]?.output?.[attribute];
      if (!val) {
        print.warning(
          `No output found for attribute '${attribute}' on resource '${dependency.resourceName}' in category '${dependency.category}'`,
        );
        print.warning('This attribute will be undefined in the mock environment until you run `amplify push`');
      }

      if (overrideApiToLocal) {
        switch (attribute) {
          case GRAPHQL_API_ENDPOINT_OUTPUT:
            val = `http://localhost:${MOCK_API_PORT}/graphql`;
            break;
          case GRAPHQL_API_KEY_OUTPUT:
            val = MOCK_API_KEY;
            break;
        }
      }

      acc[dependency.category + dependency.resourceName + attribute] = val;
    });
    return acc;
  }, {} as Record<string, string>);
};

/**
 * Loads CFN parameters from the parameters.json file for the resource (if present)
 */
const getParametersJsonParams = (_, resourceName: string): Record<string, string> => {
  return stateManager.getResourceParametersJson(undefined, 'function', resourceName, { throwIfNotExist: false }) ?? {};
};
