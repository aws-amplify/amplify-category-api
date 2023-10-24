import * as path from 'path';
import * as fs from 'fs';
import { faker } from '@faker-js/faker';
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from 'amplify-category-api-e2e-core';
import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
import { ValidateGraphqlOptions, validateGraphql } from '../../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

export type EndpointConfig = Pick<ValidateGraphqlOptions, 'apiEndpoint' | 'apiKey'>;

type ApiPostProcessor = (api: AmplifyGraphqlApi) => void;

export type TestManagedTableDeploymentProps<SetupState> = {
  name: string;
  initialSchema: string;
  updatedSchema: string;
  maxDeployDurationMs: number;
  dataSetup?: (endpointConfig: EndpointConfig) => Promise<SetupState>;
  dataValidate?: (endpointConfig: EndpointConfig, state: SetupState) => Promise<void>;
  initialApiPostProcessor?: ApiPostProcessor;
  updatedApiPostProcessor?: ApiPostProcessor;
};

export const testManagedTableDeployment = <SetupState>({
  name,
  initialSchema,
  updatedSchema,
  maxDeployDurationMs: testDurationLimitMs,
  dataSetup,
  dataValidate,
  updatedApiPostProcessor,
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
      const apiPostProcessorFilePath = path.join(projRoot, 'bin', 'apiPostProcessor.js');

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

      // Update Schema and reset apiPostProcessor, execute iterative deployment, and time the deploy
      fs.writeFileSync(schemaFilePath, updatedSchema);
      fs.unlinkSync(apiPostProcessorFilePath);
      if (updatedApiPostProcessor) {
        fs.writeFileSync(apiPostProcessorFilePath, generateApiPostProcessorFile(updatedApiPostProcessor));
      }
      const deployStartTimestamp = Date.now();
      await cdkDeploy(projRoot, '--all', { timeoutMs: testDurationLimitMs });
      const deployDurationMs = Date.now() - deployStartTimestamp;

      // Verify Data Correctness Post-Deploy
      if (dataValidate) {
        await dataValidate(endpointConfig, setupState);
      }
      // Verify Deploy Speed
      console.log(`Iterative Deploy Duration was ${deployDurationMs}ms for ${name}`);
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

const generateApiPostProcessorFile = (postProcessor: ApiPostProcessor): string => `module.exports = ${postProcessor.toString()}`;

const getRecordCount = async (endpointConfig: EndpointConfig): Promise<number> => {
  let nextToken = null;
  let resultCount = 0;
  do {
    const response = await validateGraphql({
      ...endpointConfig,
      query: /* GraphQL */ `
        query LIST_TODOS {
          listTodos(nextToken: ${nextToken ? `"${nextToken}"` : 'null'}) {
            items { id }
            nextToken
          }
        }
      `,
      expectedStatusCode: 200,
    });
    nextToken = response.body.data.listTodos.nextToken;
    resultCount += response.body.data.listTodos.items.length;
  } while (nextToken);
  return resultCount;
};

export const recordCountDataProvider = (recordCount: number, mutationBuilder: (uuid: string, i: number) => string) => {
  return async (endpointConfig: EndpointConfig): Promise<void> => {
    // Generate Data in batches of 50 per request
    const mutationBatches = splitArray(generateFakeUUIDs(recordCount), 50).map((uuidBatch) => uuidBatch.map(mutationBuilder).join('/n'));

    // And execute up to 10 requests in parallel
    for (const mutationBatch of splitArray(mutationBatches, 10)) {
      await Promise.all(
        mutationBatch.map((mutations) =>
          validateGraphql({
            ...endpointConfig,
            query: /* GraphQL */ `mutation CREATE_TODOS { ${mutations} }`,
            expectedStatusCode: 200,
          }),
        ),
      );
    }
  };
};

export const recordCountDataValidator = (expectedRecordCount: number) => {
  return async (endpointConfig: EndpointConfig): Promise<void> => {
    const recordCount = await getRecordCount(endpointConfig);
    expect(recordCount).toEqual(expectedRecordCount);
  };
};

export const recordProviderWithIdState = (mutation: string) => {
  return async (endpointConfig: EndpointConfig): Promise<string> => {
    const result = await validateGraphql({
      ...endpointConfig,
      query: /* GraphQL */ `mutation CREATE_TODO { ${mutation} }`,
      expectedStatusCode: 200,
    });
    return result.body.data.createTodo.id;
  };
};

export const recordByIdDataValidator = () => {
  return async (endpointConfig: EndpointConfig, id: string): Promise<void> => {
    const response = await validateGraphql({
      ...endpointConfig,
      query: /* GraphQL */ `
        query GET_TODO {
          getTodo(id: "${id}") { id }
        }
      `,
      expectedStatusCode: 200,
    });
    const retrievedTodo = response.body.data.getTodo;
    expect(retrievedTodo).toBeDefined();
    expect(retrievedTodo.id).toEqual(id);
  };
};
