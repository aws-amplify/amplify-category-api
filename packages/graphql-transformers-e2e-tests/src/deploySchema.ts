import * as path from 'path';
import * as os from 'os';
import { default as S3 } from 'aws-sdk/clients/s3';
import moment from 'moment';
import { Output } from 'aws-sdk/clients/cloudformation';
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
const awsS3Client = new S3({ region: region });

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
    await awsS3Client.createBucket({ Bucket: testBucketName }).promise();
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
      // Arbitrary wait to make sure everything is ready.
      await sleepSecs(10);
      expect(finishedStack).toBeDefined();
      const endpoint = getApiEndpoint(finishedStack.Outputs);
      const apiKey = getApiKey(finishedStack.Outputs);
      expect(apiKey).toBeDefined();
      expect(endpoint).toBeDefined();
      initialDeployment = false;
      console.log(`[${new Date().toISOString()}] Schema for ${testId} deployed.`);
      return new GraphQLClient(endpoint, { 'x-api-key': apiKey });
    },
    cleanup: async () => {
      await cleanupStackAfterTest(testBucketName, initialDeployment ? undefined : stackName, cf);
      await fs.remove(localBuildDir);
    },
  };
};

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
const getApiKey = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIApiKeyOutput);
