import * as path from 'path';
import * as os from 'os';
import { S3Client as AWSS3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import moment from 'moment';
import { type Output } from '@aws-sdk/client-cloudformation';
import { ResourceConstants } from 'graphql-transformer-common';
import * as fs from 'fs-extra';
import { CloudFormationClient, sleepSecs } from './CloudFormationClient';
import { GraphQLClient } from './GraphQLClient';
import { S3Client } from './S3Client';
import { cleanupStackAfterTest, deploy } from './deployNestedStacks';
import { resolveTestRegion } from './testSetup';
import { DeploymentResources } from '@aws-amplify/graphql-transformer-test-utils';

const region = resolveTestRegion();
const cf = new CloudFormationClient(region);
const customS3Client = new S3Client(region);
const awsS3Client = new AWSS3Client({ region: region });

/**
 * Interface for object that can manage graphql api deployments and cleanup for e2e tests
 */
export type SchemaDeployer = {
  /**
   * Deploy the given schema and return a client to query the API
   */
  deploy: (schema: string) => Promise<GraphQLClient>;
  /**
   * Cleanup the API
   */
  cleanup: () => Promise<void>;
};

/**
 * Returns an object that can be used to deploy and cleanup GraphQL APIs. The deploy function supports multiple deployments to the same API.
 * Each call to deploy returns a GraphQL client that can be used to query the API.
 * The cleanup function will remove all local and cloud resources related to the API.
 *
 * No other tests are refactored to use this function at this point,
 * but it would be nice to extend this function to handle spinning up and cleaning up all test GQL endpoints
 *
 * @param testId A human readable identifier for the schema / test being provisioned. Should be alphanumeric (no dashes, underscores, etc)
 * @param transformer The transformer to run on the schema
 * @param schema The schema to transform
 * @returns A GraphQL client pointing to an AppSync API with the provided schema deployed to it
 */
export const getSchemaDeployer = async (testId: string, transform: (schema: string) => DeploymentResources): Promise<SchemaDeployer> => {
  const randomSubsecondSuffix = Math.floor(Math.random() * 10000); // In case tests run too fast
  const initialTimestamp = `${moment().format('YYYYMMDDHHmmss')}${randomSubsecondSuffix}`;
  const stackName = `${testId}-${initialTimestamp}`;
  const testBucketName = `${testId}-bucket-${initialTimestamp}`.toLowerCase();
  const localBuildDir = path.join(os.tmpdir(), testId);
  const s3RootDirKey = 'deployments';
  let initialDeployment = true;

  // create deployment bucket
  try {
    await awsS3Client.send(new CreateBucketCommand({ Bucket: testBucketName }));
  } catch (err) {
    console.error(`Failed to create bucket ${testBucketName}: ${err}`);
    throw err;
  }

  return {
    deploy: async (schema: string) => {
      const deployTimestamp = moment().format('YYYYMMDDHHmmss');
      const out = transform(schema);
      const finishedStack = await deploy(
        customS3Client,
        cf,
        stackName,
        out,
        {},
        localBuildDir,
        testBucketName,
        s3RootDirKey,
        deployTimestamp,
        initialDeployment,
      );
      expect(finishedStack).toBeDefined();
      const endpoint = getApiEndpoint(finishedStack.Outputs);
      const apiKey = getApiKey(finishedStack.Outputs);
      expect(apiKey).toBeDefined();
      expect(endpoint).toBeDefined();
      initialDeployment = false;
      const client = new GraphQLClient(endpoint, { 'x-api-key': apiKey });
      // AppSync publishes the schema asynchronously AFTER CloudFormation reports the stack
      // complete, so querying immediately can hit a stale schema (e.g. a @mapsTo type rename
      // where the new `listArticles` query or a renamed foreign key field is not live yet).
      // A blind fixed sleep was flaky for large schema swaps; instead poll the live schema
      // via introspection until it is queryable, bounded so a genuinely broken deploy still fails.
      await waitForSchemaReady(client, testId);
      console.log(`[${new Date().toISOString()}] Schema for ${testId} deployed.`);
      return client;
    },
    cleanup: async () => {
      await cleanupStackAfterTest(testBucketName, initialDeployment ? undefined : stackName, cf);
      await fs.remove(localBuildDir);
    },
  };
};

/**
 * Waits until the freshly deployed AppSync schema is actually being served, rather than
 * relying on a fixed sleep. AppSync applies a schema asynchronously after CloudFormation
 * reports the stack complete, so a query issued immediately can see a stale schema. We poll
 * a cheap introspection query until it returns without errors, then a short settle so field
 * resolvers attached by the same update are live too. Bounded by a timeout so a genuinely
 * broken deploy still fails the test instead of hanging.
 */
async function waitForSchemaReady(client: GraphQLClient, testId: string): Promise<void> {
  const introspection = /* GraphQL */ `
    query IntrospectionReadyCheck {
      __schema {
        queryType {
          name
        }
      }
    }
  `;
  const maxAttempts = 30; // ~30 * 3s = 90s ceiling
  const intervalSecs = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await client.query(introspection);
      if (!res.errors && res.data?.__schema?.queryType?.name) {
        // Schema is queryable. Short settle for field-resolver propagation on large swaps.
        await sleepSecs(5);
        return;
      }
    } catch (err) {
      // Endpoint may briefly 4xx/5xx while the schema is being (re)published; keep polling.
    }
    await sleepSecs(intervalSecs);
  }
  // Fall back to the historical fixed wait rather than throwing, so a slow-but-valid deploy
  // still proceeds and the test's own assertions decide pass/fail.
  console.warn(`[${new Date().toISOString()}] Schema for ${testId} not confirmed ready after polling; proceeding after fallback wait.`);
  await sleepSecs(10);
}

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs?.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
const getApiKey = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIApiKeyOutput);
