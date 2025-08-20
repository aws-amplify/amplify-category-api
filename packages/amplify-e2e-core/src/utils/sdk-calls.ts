import { DynamoDBClient, DescribeTableCommand, ListTagsOfResourceCommand } from '@aws-sdk/client-dynamodb';
import {
  S3Client,
  HeadBucketCommand,
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
  DeleteBucketCommand,
  GetBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import {
  IAMClient,
  ListRolesCommand,
  GetRolePolicyCommand,
  ListRolePoliciesCommand,
  ListAttachedRolePoliciesCommand,
} from '@aws-sdk/client-iam';
import _ from 'lodash';

// Note: Some services are not available in the current AWS SDK v3 setup
// These functions will need to be updated when the packages are available

export const getDDBTable = async (tableName: string, region: string) => {
  const client = new DynamoDBClient({ region });
  if (tableName) {
    return await client.send(new DescribeTableCommand({ TableName: tableName }));
  }
};

export const getDDBTableTags = async (tableName: string, region: string) => {
  const client = new DynamoDBClient({ region });
  return await client.send(new ListTagsOfResourceCommand({ ResourceArn: tableName }));
};

export const checkIfBucketExists = async (bucketName: string, region: string) => {
  const client = new S3Client({ region });
  return await client.send(new HeadBucketCommand({ Bucket: bucketName }));
};

export const bucketNotExists = async (bucket: string) => {
  const s3 = new S3Client({});
  const maxAttempts = 10;
  const delay = 30000; // 30 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      // If no error, bucket exists, wait and try again
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return true; // Bucket doesn't exist
      }
      throw error;
    }
  }
  return false; // Bucket still exists after max attempts
};

export const deleteS3Bucket = async (bucket: string, providedS3Client: S3Client | undefined = undefined) => {
  const s3 = providedS3Client ? providedS3Client : new S3Client({});
  let keyMarker: string | undefined;
  let versionIdMarker: string | undefined;
  const objectKeyAndVersion: { Key: string; VersionId?: string }[] = [];
  let isTruncated = false;

  do {
    const command = new ListObjectVersionsCommand({
      Bucket: bucket,
      KeyMarker: keyMarker,
      VersionIdMarker: versionIdMarker,
    });
    const results = await s3.send(command);

    results.Versions?.forEach(({ Key, VersionId }) => {
      if (Key) {
        objectKeyAndVersion.push({ Key, VersionId });
      }
    });

    results.DeleteMarkers?.forEach(({ Key, VersionId }) => {
      if (Key) {
        objectKeyAndVersion.push({ Key, VersionId });
      }
    });

    keyMarker = results.NextKeyMarker;
    versionIdMarker = results.NextVersionIdMarker;
    isTruncated = results.IsTruncated || false;
  } while (isTruncated);

  const chunkedResult = _.chunk(objectKeyAndVersion, 1000);
  const deletePromises = chunkedResult.map((objects) => {
    return s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: objects,
          Quiet: true,
        },
      }),
    );
  });

  await Promise.all(deletePromises);
  await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
  await bucketNotExists(bucket);
};

// TODO: Migrate these functions when AWS SDK v3 packages are available
export const getUserPool = async (userpoolId: string, region: string) => {
  // Temporarily using require to avoid import errors
  const { CognitoIdentityServiceProvider } = require('aws-sdk');
  const client = new CognitoIdentityServiceProvider({ region });
  try {
    return await client.describeUserPool({ UserPoolId: userpoolId }).promise();
  } catch (e) {
    console.log(e);
  }
};

export const getLambdaFunction = async (functionName: string, region: string) => {
  const client = new LambdaClient({ region });
  try {
    return await client.send(new GetFunctionCommand({ FunctionName: functionName }));
  } catch (e) {
    console.log(e);
  }
};

export const getUserPoolClients = async (userPoolId: string, clientIds: string[], region: string) => {
  // Temporarily using require to avoid import errors
  const { CognitoIdentityServiceProvider } = require('aws-sdk');
  const client = new CognitoIdentityServiceProvider({ region });
  const res = [];
  try {
    for (let i = 0; i < clientIds.length; i++) {
      const clientData = await client
        .describeUserPoolClient({
          UserPoolId: userPoolId,
          ClientId: clientIds[i],
        })
        .promise();
      res.push(clientData);
    }
  } catch (e) {
    console.log(e);
  }
  return res;
};

export const getTable = async (tableName: string, region: string) => {
  const client = new DynamoDBClient({ region });
  return await client.send(new DescribeTableCommand({ TableName: tableName }));
};

export const putItemInTable = async (tableName: string, region: string, item: unknown) => {
  // Temporarily using require to avoid import errors
  const { DynamoDB } = require('aws-sdk');
  const ddb = new DynamoDB.DocumentClient({ region });
  return await ddb.put({ TableName: tableName, Item: item }).promise();
};

export const scanTable = async (tableName: string, region: string) => {
  // Temporarily using require to avoid import errors
  const { DynamoDB } = require('aws-sdk');
  const ddb = new DynamoDB.DocumentClient({ region });
  return await ddb.scan({ TableName: tableName }).promise();
};

export const getAppSyncApi = async (appSyncApiId: string, region: string) => {
  // Temporarily using require to avoid import errors
  const { AppSync } = require('aws-sdk');
  const client = new AppSync({ region });
  return await client.getGraphqlApi({ apiId: appSyncApiId }).promise();
};

export const listAppSyncFunctions = async (appSyncApiId: string, region: string) => {
  // Temporarily using require to avoid import errors
  const { AppSync } = require('aws-sdk');
  const client = new AppSync({ region });
  return await client.listFunctions({ apiId: appSyncApiId }).promise();
};

export const describeCloudFormationStack = async (stackName: string, region: string, profileConfig?: any) => {
  // Temporarily using require to avoid import errors
  const { CloudFormation } = require('aws-sdk');
  const clientConfig = profileConfig ? { ...profileConfig, region } : { region };
  const client = new CloudFormation(clientConfig);
  const result = await client.describeStacks({ StackName: stackName }).promise();
  return result.Stacks?.find((stack) => stack.StackName === stackName || stack.StackId === stackName);
};

export const getNestedStackID = async (stackName: string, region: string, logicalId: string): Promise<string> => {
  // Temporarily using require to avoid import errors
  const { CloudFormation } = require('aws-sdk');
  const client = new CloudFormation({ region });
  const resource = await client
    .describeStackResources({
      StackName: stackName,
      LogicalResourceId: logicalId,
    })
    .promise();
  return resource?.StackResources?.[0].PhysicalResourceId ?? null;
};

/**
 * Collects table resource id from parent stack
 * @param region region the stack exists in
 * @param table name of the table used in the appsync schema
 * @param StackId id of the parent stack
 * @returns
 */
export const getTableResourceId = async (region: string, table: string, StackId: string): Promise<string | null> => {
  // Temporarily using require to avoid import errors
  const { CloudFormation } = require('aws-sdk');
  const client = new CloudFormation({ region });
  const apiResources = await client
    .describeStackResources({
      StackName: StackId,
    })
    .promise();
  const resource = apiResources.StackResources?.find((stackResource) => table === stackResource.LogicalResourceId);
  if (resource) {
    const tableStack = await client.describeStacks({ StackName: resource.PhysicalResourceId }).promise();
    if (tableStack?.Stacks?.length > 0) {
      const tableName = tableStack.Stacks[0].Outputs?.find((out) => out.OutputKey === `GetAtt${resource.LogicalResourceId}TableName`);
      return tableName?.OutputValue || null;
    }
  }
  return null;
};

export const setupAmplifyAdminUI = async (appId: string, region: string) => {
  // Temporarily using require to avoid import errors
  const { AmplifyBackend } = require('aws-sdk');
  const client = new AmplifyBackend({ region });
  return await client.createBackendConfig({ AppId: appId }).promise();
};

export const getAmplifyBackendJobStatus = async (jobId: string, appId: string, envName: string, region: string) => {
  // Temporarily using require to avoid import errors
  const { AmplifyBackend } = require('aws-sdk');
  const client = new AmplifyBackend({ region });
  return await client
    .getBackendJob({
      JobId: jobId,
      AppId: appId,
      BackendEnvironmentName: envName,
    })
    .promise();
};

export const listRoleNamesContaining = async (searchString: string, region: string): Promise<string[]> => {
  const client = new IAMClient({ region });

  const roles: string[] = [];
  let isTruncated = true;
  let marker: string | undefined;

  while (isTruncated) {
    const command = new ListRolesCommand(marker ? { Marker: marker } : {});
    const response = await client.send(command);

    const matchingRoles = response.Roles?.filter((role) => role.RoleName?.includes(searchString)) || [];
    roles.push(...matchingRoles.map((r) => r.RoleName!));

    isTruncated = response.IsTruncated || false;
    marker = response.Marker;
  }

  return roles;
};

export const getRolePolicy = async (roleName: string, policyName: string, region: string): Promise<any> => {
  const client = new IAMClient({ region });
  const response = await client.send(
    new GetRolePolicyCommand({
      PolicyName: policyName,
      RoleName: roleName,
    }),
  );
  const rawDocument = response.PolicyDocument;
  if (rawDocument) {
    const decodedDocument = decodeURIComponent(rawDocument);
    return JSON.parse(decodedDocument);
  }
  return null;
};

export const listRolePolicies = async (roleName: string, region: string): Promise<string[]> => {
  const client = new IAMClient({ region });
  const response = await client.send(new ListRolePoliciesCommand({ RoleName: roleName }));
  return response.PolicyNames || [];
};

export const listAttachedRolePolicies = async (roleName: string, region: string) => {
  const client = new IAMClient({ region });
  const response = await client.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }));
  return response.AttachedPolicies || [];
};

export const getBucketNameFromModelSchemaS3Uri = (uri: string | null): string | null => {
  const pattern = /(s3:\/\/)(.*)(\/.*)/;
  const matches = uri?.match(pattern);
  // Sample Input Uri looks like 's3://bucket-name/model-schema.graphql'.
  // The output of string.match returns an array which looks like the below. The third element is the bucket name.
  // [
  //     "s3://bucket-name/model-schema.graphql",
  //     "s3://",
  //     "bucket-name",
  //     "/model-schema.graphql"
  // ]
  const BUCKET_NAME_INDEX = 2;
  if (!matches) {
    return null;
  }
  if (matches.length && matches.length > BUCKET_NAME_INDEX) {
    return matches[BUCKET_NAME_INDEX];
  }
  return null;
};

export const getBucketCorsPolicy = async (bucketName: string, region: string): Promise<Record<string, any>[]> => {
  const client = new S3Client({ region });
  const response = await client.send(
    new GetBucketCorsCommand({
      Bucket: bucketName,
    }),
  );
  return response.CORSRules || [];
};
