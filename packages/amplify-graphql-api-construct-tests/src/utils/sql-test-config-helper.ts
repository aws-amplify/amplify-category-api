import * as path from 'path';
import { AUTH_TYPE } from 'aws-appsync';
import { SQLLambdaResourceNames } from '@aws-amplify/graphql-transformer-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { StackConfig } from './sql-stack-config';
import { ONE_MINUTE } from './duration-constants';

export interface TestOptions {
  projFolderName: string;
  region: string;
  connectionConfigName: string;
  dbController: SqlDatatabaseController;
  resourceNames?: SQLLambdaResourceNames;
}

export interface TestConfigInput {
  options: TestOptions;
  stackConfig: StackConfig;
  additionalDependencies?: string[];
}

export interface TestConfigOutput {
  schema: string;
  authType: AUTH_TYPE;
  dbController: SqlDatatabaseController;
  projRoot: string;
  apiEndpoint: string;
  apiKey: string;
  region: string;
  lambdaFunctionName: string;
  lambdaAliasName?: string;
  userPoolId?: string;
  webClientId?: string;
  userGroups?: string[];
}

export const setupTest = async (input: TestConfigInput): Promise<TestConfigOutput> => {
  const {
    options: { projFolderName, connectionConfigName, dbController, resourceNames },
    stackConfig,
    additionalDependencies = [],
  } = input;

  const templatePath = path.resolve(path.join(__dirname, '..', '__tests__', 'backends', 'sql-configurable-stack'));
  const projRoot = await createNewProjectDir(projFolderName);
  const name = await initCDKProject(projRoot, templatePath, { additionalDependencies });

  dbController.writeDbDetails(projRoot, connectionConfigName, stackConfig);

  const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
  const testOutputs = outputs[name];

  return {
    schema: stackConfig.schema,
    authType: stackConfig.authMode,
    dbController,
    projRoot,
    apiEndpoint: testOutputs.awsAppsyncApiEndpoint,
    apiKey: testOutputs.awsAppsyncApiKey,
    region: testOutputs.awsAppsyncRegion,
    lambdaFunctionName: testOutputs.SQLFunctionName,
    ...(resourceNames !== undefined && { lambdaAliasName: resourceNames.sqlLambdaAliasName }),
    ...(testOutputs.userPoolId !== undefined && { userPoolId: testOutputs.userPoolId }),
    ...(testOutputs.webClientId !== undefined && { webClientId: testOutputs.webClientId }),
    ...(stackConfig.userGroups !== undefined && { userGroups: stackConfig.userGroups }),
  };
};

export const cleanupTest = async (testConfigOutput: TestConfigOutput): Promise<void> => {
  try {
    await cdkDestroy(testConfigOutput.projRoot, '--all');
    await testConfigOutput.dbController.clearDatabase();
  } catch (err) {
    console.log(`Error invoking 'cdk destroy': ${err}`);
  }

  deleteProjectDir(testConfigOutput.projRoot);
};
