import { CloudFormationClient } from '../CloudFormationClient';
import { S3Client } from '../S3Client';
import { Output } from 'aws-sdk/clients/cloudformation';
import { resolveTestRegion } from '../testSetup';
import { default as S3 } from 'aws-sdk/clients/s3';
import { default as moment } from 'moment';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { SequenceTransformer } from '@aws-amplify/graphql-sequence-transformer';
import { cleanupStackAfterTest, deploy } from '../deployNestedStacks';
import { ResourceConstants } from 'graphql-transformer-common';
import { GraphQLClient } from '../GraphQLClient';
import { constructDataSourceStrategies, POSTGRES_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';

const region = resolveTestRegion();
jest.setTimeout(2000000);

const cf = new CloudFormationClient(region);
const customS3Client = new S3Client(region);
const awsS3Client = new S3({ region: region });
const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
const STACK_NAME = `SequenceTransformerTests-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `appsync-sequence-transformer-test-bucket-${BUILD_TIMESTAMP}`;
const LOCAL_FS_BUILD_DIR = '/tmp/sequence_transformer_tests/';
const S3_ROOT_DIR_KEY = 'deployments';

let GRAPHQL_CLIENT!: GraphQLClient;

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

beforeAll(async () => {
  const validSchema = `
    type CoffeeWaiter @model {
      id: ID!
      orderNumber: Int @sequence
      name: String
    }
  `;

  try {
    await awsS3Client.createBucket({ Bucket: BUCKET_NAME }).promise();
  } catch (e) {
    console.warn(`Could not create bucket: ${e}`);
  }

  //const postgresStrategy = mockSqlDataSourceStrategy({dbType: POSTGRES_DB_TYPE})

  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new SequenceTransformer()],
    //transformers: [new ModelTransformer(), new SequenceTransformer(), new PrimaryKeyTransformer()],
    transformParameters: {
      sandboxModeEnabled: true,
    },
    //dataSourceStrategies: constructDataSourceStrategies(validSchema, postgresStrategy)
  });

  const finishedStack = await deploy(
    customS3Client,
    cf,
    STACK_NAME,
    out,
    {},
    LOCAL_FS_BUILD_DIR,
    BUCKET_NAME,
    S3_ROOT_DIR_KEY,
    BUILD_TIMESTAMP,
  );
  // Arbitrary wait to make sure everything is ready.
  await cf.wait(10, () => Promise.resolve());
  expect(finishedStack).toBeDefined();
  expect(finishedStack.Outputs).toBeDefined();
  const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
  const getApiKey = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIApiKeyOutput);
  const endpoint = getApiEndpoint(finishedStack.Outputs!);
  const apiKey = getApiKey(finishedStack.Outputs!);

  expect(apiKey).toBeDefined();
  expect(endpoint).toBeDefined();
  GRAPHQL_CLIENT = new GraphQLClient(endpoint!, { 'x-api-key': apiKey });
});

afterAll(async () => {
  await cleanupStackAfterTest(BUCKET_NAME, STACK_NAME, cf);
});

test('Sequence Directive', async () => {
  await addToQueue();

  const wantsCoffee = await listQueue();
  expect(wantsCoffee.data).toBeDefined();
  expect(wantsCoffee.data.listCoffeeWaiters.items).toHaveLength(1);
});

async function addToQueue() {
  return await GRAPHQL_CLIENT.query(
    `mutation CreateCoffeeWaiter {
        createCoffeeWaiter(input: {}) {
          id
        }
    }`,
  );
}

async function listQueue() {
  return await GRAPHQL_CLIENT.query(
    `query ListCoffeeWaiters {
      listCoffeeWaiters {
        items {
          id
          name
          orderNumber
        }
      }
    }`,
  );
}
