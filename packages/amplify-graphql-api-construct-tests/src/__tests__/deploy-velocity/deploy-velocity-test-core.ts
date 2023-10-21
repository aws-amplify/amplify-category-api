import * as path from 'path';
import * as fs from 'fs';
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from 'amplify-category-api-e2e-core';
import { faker } from '@faker-js/faker';
import { ValidateGraphqlOptions } from '../../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

export type EndpointConfig = Pick<ValidateGraphqlOptions, 'apiEndpoint' | 'apiKey'>;

export type TestManagedTableDeploymentProps<SetupState> = {
  name: string;
  initialSchema: string;
  updatedSchema: string;
  maxDeployDurationMs: number;
  dataSetup?: (endpointConfig: EndpointConfig) => Promise<SetupState>;
  dataValidate?: (endpointConfig: EndpointConfig, state: SetupState) => Promise<void>;
};

export const testManagedTableDeployment = <SetupState>({
  name,
  initialSchema,
  updatedSchema,
  maxDeployDurationMs: testDurationLimitMs,
  dataSetup,
  dataValidate,
}: TestManagedTableDeploymentProps<SetupState>): void => {
  describe(name, () => {
    let projRoot: string;
    let projFolderName: string;
    let wasDestroyed: boolean;

    beforeEach(async () => {
      wasDestroyed = false;
      projFolderName = 'managedtable';
      projRoot = await createNewProjectDir(projFolderName);
    });

    afterEach(async () => {
      if (!wasDestroyed) {
        try {
          await cdkDestroy(projRoot, '--all');
        } catch (_) {
          // No-op
        }
      }
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

      let setupState = undefined;
      // Setup initial data
      if (dataSetup) {
        setupState = await dataSetup(endpointConfig);
      }

      // Verify Data Correctness Pre-Deploy
      if (dataValidate) {
        await dataValidate(endpointConfig, setupState);
      }

      // Update Schema, and execute iterative deployment, timing the deploy
      fs.writeFileSync(schemaFilePath, updatedSchema);
      const deployStartTimestamp = Date.now();
      await cdkDeploy(projRoot, '--all', { timeoutMs: testDurationLimitMs });
      const deployDurationMs = Date.now() - deployStartTimestamp;

      // Verify Data Correctness Post-Deploy
      if (dataValidate) {
        await dataValidate(endpointConfig, setupState);
      }
      // Verify Deploy Speed
      console.log(`Iterative Deploy Duration was ${deployDurationMs}ms`);
      expect(deployDurationMs).toBeLessThanOrEqual(testDurationLimitMs);

      // Cleanup after test complete as part of test, if this hasn't run we'll run during `afterEach`.
      // This has the side-effect of validating teardown in the test, but still attempting to cleanup if the test failed
      await cdkDestroy(projRoot, '--all');
      wasDestroyed = true;
    });
  });
};

/**
 * Generate n fake uuids for testing
 * @param count the number of ids to return
 * @returns the list of fake ids
 */
export const generateFakeUUIDs = (count: number): string[] => Array.apply(0, new Array(count)).map((_) => faker.string.uuid());

/**
 * Given a list of object, and a chunk size, break into a list of lists, all of which has,
 * at most, the number of elements provided by chunkSize.
 * @param inputArray the input elements to partition
 * @param chunkSize the max size of any given partition for the resulting arrays.
 * @returns the input array partitioned by chunksize.
 */
export const splitArray = <T>(inputArray: T[], chunkSize: number): T[][] => {
  if (chunkSize < 1) {
    throw new Error('Chunk size must be greater than 0');
  }
  return inputArray.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / chunkSize);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, [] as T[][]);
};
