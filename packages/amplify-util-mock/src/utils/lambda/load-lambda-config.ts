import { $TSContext, JSONUtilities, pathManager } from '@aws-amplify/amplify-cli-core';
import detect from 'detect-port';
import * as path from 'path';
import { MOCK_API_PORT } from '../../api/api';
import { lambdaFunctionHandler } from '../../CFNParser/resource-processors/lambda';
import { ProcessedLambdaFunction } from '../../CFNParser/stack/types';
import { populateCfnParams } from './populate-cfn-params';
import { populateLambdaMockEnvVars } from './populate-lambda-mock-env-vars';

const CFN_DEFAULT_CONDITIONS = {
  ShouldNotCreateEnvResources: true,
};

/**
 * Loads the necessary parameters for mocking a lambda function
 *
 * Locates and parses the CFN template for the function and injects environment variables
 * @param resourceName The labmda resource to load
 * @param print The print object from context
 */
export const loadLambdaConfig = async (
  context: $TSContext,
  resourceName: string,
  overrideApiToLocal = false,
): Promise<ProcessedLambdaFunction> => {
  overrideApiToLocal = overrideApiToLocal || (await isApiRunning());
  const resourcePath = path.join(pathManager.getBackendDirPath(), 'function', resourceName);
  const { Resources: cfnResources } = JSONUtilities.readJson<{ Resources: Record<string, any> }>(
    path.join(resourcePath, `${resourceName}-cloudformation-template.json`),
  );
  const lambdaDef = Object.entries(cfnResources).find(([_, resourceDef]: [string, any]) => resourceDef.Type === 'AWS::Lambda::Function');
  if (!lambdaDef) {
    return;
  }
  const cfnParams = await populateCfnParams(context.print, resourceName, overrideApiToLocal);
  const processedLambda = lambdaFunctionHandler(lambdaDef[0], lambdaDef[1], {
    conditions: CFN_DEFAULT_CONDITIONS,
    params: cfnParams,
    exports: {},
    resources: {},
  });
  await populateLambdaMockEnvVars(context, processedLambda);
  return processedLambda;
};

const isApiRunning = async (): Promise<boolean> => {
  const result = await detect(MOCK_API_PORT);
  // returns the next free port so if the API is running, then the port will be different
  return result !== MOCK_API_PORT;
};
