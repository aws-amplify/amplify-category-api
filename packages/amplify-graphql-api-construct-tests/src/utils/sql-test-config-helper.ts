import * as path from 'node:path';
import { AUTH_TYPE } from 'aws-appsync';
import { SQLLambdaResourceNames } from '@aws-amplify/graphql-transformer-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { StackConfig } from './sql-stack-config';
import { ONE_MINUTE } from './duration-constants';
import { TestProjectSourceStrategy } from './test-project-source-strategy';

export interface TestOptions {
  projFolderName: string;
  region: string;
  connectionConfigName: string;
  dbController: SqlDatatabaseController;
  resourceNames?: SQLLambdaResourceNames;

  /**
   * An optional strategy to specify how to get the source of the CDK test project resources. If not specified, defaults to
   * "create-and-destroy".
   */
  projSourceStrategy?: TestProjectSourceStrategy;
}

export interface TestConfigInput {
  options: TestOptions;
  stackConfig: StackConfig;
  additionalDependencies?: string[];
}

export interface TestConfigOutput {
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

  // A strategy to use for subsequent runs of this test
  projSourceStrategy: TestProjectSourceStrategy;
}

/**
 * Sets up a new CDK project, or reuses an existing one. Regardless, always performs a `cdk deploy` on the stack, to ensure we pick up
 * changed resources.
 */
export const setupTest = async (input: TestConfigInput): Promise<TestConfigOutput> => {
  const {
    options: { projFolderName, connectionConfigName, dbController, resourceNames, projSourceStrategy: inputProjSourceStrategy },
    stackConfig,
    additionalDependencies = [],
  } = input;

  let projName: string;
  let projRoot: string;

  const projSourceStrategy = inputProjSourceStrategy ?? {
    type: 'create-and-destroy',
    retain: false,
  };

  if (projSourceStrategy.type === 'reuse-existing') {
    projName = projSourceStrategy.projName;
    projRoot = projSourceStrategy.projRoot;
  } else {
    const templatePath = path.resolve(path.join(__dirname, '..', '__tests__', 'backends', 'sql-configurable-stack'));
    projRoot = await createNewProjectDir(projFolderName);
    projName = await initCDKProject(projRoot, templatePath, { additionalDependencies });
    dbController.writeDbDetails(projRoot, connectionConfigName, stackConfig);
  }

  const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
  const testOutputs = outputs[projName];

  const outputProjSourceStrategy: TestProjectSourceStrategy = projSourceStrategy.retain
    ? {
        type: 'reuse-existing',
        projName,
        projRoot,
        retain: true,
      }
    : {
        type: 'create-and-destroy',
        retain: false,
      };

  return {
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
    ...(testOutputs.userPoolGroups !== undefined && { userGroups: JSON.parse(testOutputs.userPoolGroups) }),
    projSourceStrategy: outputProjSourceStrategy,
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
