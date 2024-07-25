import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
import { faker } from '@faker-js/faker';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as fs from 'fs';
import * as path from 'path';
import { cdkDeploy, cdkDestroy, initCDKProject } from '../../commands';
import { validateGraphql, ValidateGraphqlOptions } from '../../graphql-request';
import { DURATION_90_MINUTES } from '../../utils/duration-constants';

jest.setTimeout(DURATION_90_MINUTES);

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

/**
 * Core entry point for managed table deployment velocity and correctness tests.
 * Tests using this entry point can simply mix and match their lifecycle stages from building-blocks,
 * and tests will execute the following steps based on input props.
 *
 * 1. Set up a simple CDK app with GraphqlApi using managed tables and API Key auth.
 * 2. Deploy an initial graphql schema via cdk deploy.
 * 3. Run a data setup task, and store stated in a strongly-typed variable.
 * 4. Run a data validation task, to ensure setup was successful, and data can be retrieved.
 * 5. Deploy an updated graphql schema via cdk deploy, measuring the time it takes to deploy.
 * 6. Run the data validation task again, ensuring that after deploy data continuity is achieved.
 * 7. Validate the measured deploy time is within configured parameters.
 * 8. Teardown the stack.
 * @param param0 the input params
 * @param param0.name the suite name, used to name the test, and in logging
 * @param param0.initialSchema the initial graphql schema to deploy
 * @param param0.updatedSchema the updated graphql schema to deploy
 * @param param0.maxDeployDurationMs the amount of time to wait for response in CLI, and fail if we exceed.
 * @param param0.dataSetup the optional data setup lifecycle step to seed fixture data
 * @param param0.dataValidate the optional data validation lifecycle step to ensure data integrity after setup and after deploy
 * @param param0.updatedApiPostProcessor the optional post processing step (to be run during synth) for override checks
 */
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
      if (fs.existsSync(apiPostProcessorFilePath)) {
        fs.unlinkSync(apiPostProcessorFilePath);
      }
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

/**
 * Given an api post processor, generate the file contents which can be imported by the test harness.
 * @param postProcessor the synth callback method.
 * @returns the file contents to write to disk as a string.
 */
const generateApiPostProcessorFile = (postProcessor: ApiPostProcessor): string => `
  import * as aws_dynamodb_1 from 'aws-cdk-lib/aws-dynamodb';

  module.exports = ${postProcessor.toString()}
`;

/**
 * Retrieve the record count from a given todo table for a provided endpoint config.
 * @param endpointConfig api url and api key for making api-key requests.
 * @returns the number of records retrieved.
 */
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

/**
 * Data provider plugin which generates a particular number of records for the provided mutationbuilder.
 * @param recordCount the number of records to match
 * @param mutationBuilder the mutation builder, intended to support different mutation input shapes
 * @returns the data provider, to plug into the test harness above
 */
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

/**
 * Data validator ensuring a particular number of records were found in the provided table.
 * @param expectedRecordCount the number of records to validate against.
 * @returns the data validator, to plug into the test harness above
 */
export const recordCountDataValidator = (expectedRecordCount: number) => {
  return async (endpointConfig: EndpointConfig): Promise<void> => {
    const recordCount = await getRecordCount(endpointConfig);
    expect(recordCount).toEqual(expectedRecordCount);
  };
};

/**
 * Data provider plugin which generates a single records given a mutation shape, and returns it's id into the state.
 * @param mutation the mutation to run, intended to support different mutation input shapes
 * @returns the data provider, to plug into the test harness above
 */
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

/**
 * Data validator ensuring a particular records was found by id in the provided table, where id stored in state.
 * @returns the data validator, to plug into the test harness above
 */
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
