import { CfnParameter } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { getStackForScope } from './node-traversal';

/**
 * Search up in the scope for the nearest stack, then snag the CfnParameters in there.
 * @param scope the scope to check
 * @returns the list of CfnParameters
 */
const getParametersForScope = (scope: Construct): CfnParameter[] =>
  getStackForScope(scope).node.children.filter((construct) => construct instanceof CfnParameter) as CfnParameter[];

/**
 * Set parameter `defaults` for known params (artifacts of the transformer)
 * @param scope the scope to search up for parameters.
 * @param defaultParameters the default params to write into the CfnParameters
 */
export const setKnownParameterDefaults = (scope: Construct, defaultParameters: Record<string, string>): void =>
  getParametersForScope(scope).forEach((parameter) => {
    const parameterId = parameter.node.id;
    if (parameterId in defaultParameters) {
      // eslint-disable-next-line no-param-reassign
      parameter.default = defaultParameters[parameterId];
    }
  });

/**
 * Throw if any params are missing default values
 * @param scope where we're checking for params
 */
export const validateAllParametersHaveDefaults = (scope: Construct): void =>
  getParametersForScope(scope).forEach((parameter) => {
    const paramId = parameter.node.id;
    const defaultValue = parameter.default;
    if (!defaultValue) {
      throw new Error(`Need to add default to ${paramId} parameter`);
    }
  });
