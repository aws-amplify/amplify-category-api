import * as path from 'path';
import * as fs from 'fs';
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from 'amplify-category-api-e2e-core';
import { ValidateGraphqlOptions } from '../../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

export type EndpointConfig = Pick<ValidateGraphqlOptions, 'apiEndpoint' | 'apiKey'>;

export type TestManagedTableDeploymentProps<SetupState> = {
  name: string;
  initialSchema: string;
  updatedSchema: string;
  testDurationLimitMs: number;
  dataSetup: (endpointConfig: EndpointConfig) => Promise<SetupState>;
  dataValidate: (endpointConfig: EndpointConfig, state: SetupState) => Promise<void>;
};

export const testManagedTableDeployment = <SetupState>({
  name,
  initialSchema,
  updatedSchema,
  testDurationLimitMs,
  dataSetup,
  dataValidate,
}: TestManagedTableDeploymentProps<SetupState>): void => {
  describe(name, () => {
    let projRoot: string;
    let projFolderName: string;

    beforeEach(async () => {
      projFolderName = 'managedtable';
      projRoot = await createNewProjectDir(projFolderName);
    });

    afterEach(async () => {
      deleteProjectDir(projRoot);
    });

    test('CDK Multi GSI', async () => {
      // Setup App
      const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'managed-table-testbench'));
      const stackName = await initCDKProject(projRoot, templatePath);
      const schemaFilePath = path.join(projRoot, 'bin', 'schema.graphql');

      // Deploy with initial schema, and generate config for data operations
      fs.writeFileSync(schemaFilePath, initialSchema);
      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[stackName];
      const endpointConfig: EndpointConfig = { apiEndpoint, apiKey };

      // Setup initial data
      const setupState = await dataSetup(endpointConfig);

      // Verify Data Correctness Pre-Deploy
      await dataValidate(endpointConfig, setupState);

      // Update Schema, and execute iterative deployment, timing the deploy
      fs.writeFileSync(schemaFilePath, updatedSchema);
      const deployStartTimestamp = Date.now();
      await cdkDeploy(projRoot, '--all');
      const deployDurationMs = Date.now() - deployStartTimestamp;

      // Verify Data Correctness Post-Deploy
      await dataValidate(endpointConfig, setupState);

      // Verify Deploy Speed
      console.log(`Iterative Deploy Duration was ${deployDurationMs}ms`);
      expect(deployDurationMs).toBeLessThanOrEqual(testDurationLimitMs);

      // Cleanup after test complete
      await cdkDestroy(projRoot, '--all');
    });
  });
};
