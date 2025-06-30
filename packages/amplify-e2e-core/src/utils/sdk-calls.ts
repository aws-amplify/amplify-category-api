/* eslint-disable import/no-extraneous-dependencies */
import {
  AmplifyBackendClient,
  CreateBackendConfigCommand,
  CreateBackendConfigCommandOutput,
  GetBackendJobCommand,
  GetBackendJobCommandOutput,
} from '@aws-sdk/client-amplifybackend';
import {
  AppSyncClient,
  GetGraphqlApiCommand,
  GetGraphqlApiCommandOutput,
  ListFunctionsCommand,
  ListFunctionsCommandOutput,
} from '@aws-sdk/client-appsync';
import { CloudFormationClient, DescribeStacksCommand, DescribeStackResourcesCommand, Stack } from '@aws-sdk/client-cloudformation';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
  DescribeUserPoolClientCommand,
  DescribeUserPoolCommandOutput,
  DescribeUserPoolClientCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  DynamoDBClient,
  DescribeTableCommand,
  DescribeTableCommandOutput,
  ListTagsOfResourceCommand,
  ListTagsOfResourceCommandOutput,
} from '@aws-sdk/client-dynamodb';
import { AttachedPolicy, IAMClient, ListRolePoliciesCommand, ListAttachedRolePoliciesCommand } from '@aws-sdk/client-iam';
import { LambdaClient, GetFunctionCommand, GetFunctionCommandOutput } from '@aws-sdk/client-lambda';
import {
  S3Client,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  GetBucketCorsCommand,
  HeadBucketCommand,
  HeadBucketCommandOutput,
  ListObjectVersionsCommand,
  ObjectIdentifier,
  waitUntilBucketNotExists,
} from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand, PutCommandOutput, ScanCommand, ScanCommandOutput } from '@aws-sdk/lib-dynamodb';
import _ from 'lodash';

export const getDDBTable = async (tableName: string, region: string): Promise<DescribeTableCommandOutput | undefined> => {
  const client = new DynamoDBClient({ region });
  if (tableName) {
    return await client.send(new DescribeTableCommand({ TableName: tableName }));
  }
  return undefined;
};

export const getDDBTableTags = async (tableName: string, region: string): Promise<ListTagsOfResourceCommandOutput> => {
  const client = new DynamoDBClient({ region });
  return await client.send(new ListTagsOfResourceCommand({ ResourceArn: tableName }));
};

export const checkIfBucketExists = async (bucketName: string, region: string): Promise<HeadBucketCommandOutput> => {
  const client = new S3Client({ region });
  return await client.send(new HeadBucketCommand({ Bucket: bucketName }));
};

export const bucketNotExists = async (bucket: string): Promise<boolean> => {
  const s3 = new S3Client();
  try {
    const result = await waitUntilBucketNotExists(
      {
        client: s3,
        maxWaitTime: 300,
      },
      {
        Bucket: bucket,
      },
    );
    return result.state === 'SUCCESS';
  } catch (error) {
    if (error.statusCode === 200) {
      return false;
    }
    throw error;
  }
};

export const deleteS3Bucket = async (bucket: string, providedS3Client?: S3Client): Promise<any> => {
  const s3 = providedS3Client ?? new S3Client({});

  let continuationToken: {
    KeyMarker?: string;
    VersionIdMarker?: string;
  } = {};

  const objectKeyAndVersion: ObjectIdentifier[] = [];
  let truncated = false;

  do {
    const results = await s3.send(
      new ListObjectVersionsCommand({
        Bucket: bucket,
        ...continuationToken,
      }),
    );

    results.Versions?.forEach(({ Key, VersionId }) => {
      if (Key && VersionId) objectKeyAndVersion.push({ Key, VersionId });
    });

    results.DeleteMarkers?.forEach(({ Key, VersionId }) => {
      if (Key && VersionId) objectKeyAndVersion.push({ Key, VersionId });
    });

    continuationToken = {
      KeyMarker: results.NextKeyMarker,
      VersionIdMarker: results.NextVersionIdMarker,
    };

    truncated = !!results.IsTruncated;
  } while (truncated);

  const chunkedDeletes = _.chunk(objectKeyAndVersion, 1000);

  await Promise.all(
    chunkedDeletes.map((chunk) =>
      s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: chunk,
            Quiet: true,
          },
        }),
      ),
    ),
  );

  await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
  await bucketNotExists(bucket);
};

export const getUserPool = async (userPoolId: string, region: string): Promise<DescribeUserPoolCommandOutput> => {
  const client = new CognitoIdentityProviderClient({ region });
  try {
    const res = await client.send(new DescribeUserPoolCommand({ UserPoolId: userPoolId }));
    return res;
  } catch (e) {
    console.error(e);
    return undefined;
  }
};

export const getLambdaFunction = async (functionName: string, region: string): Promise<GetFunctionCommandOutput | undefined> => {
  const client = new LambdaClient({ region });
  try {
    return await client.send(new GetFunctionCommand({ FunctionName: functionName }));
  } catch (e) {
    console.log(e);
  }
  return undefined;
};

export const getUserPoolClients = async (
  userPoolId: string,
  clientIds: string[],
  region: string,
): Promise<DescribeUserPoolClientCommandOutput[]> => {
  const client = new CognitoIdentityProviderClient({ region });
  const res = [] as DescribeUserPoolClientCommandOutput[];

  for (const clientId of clientIds) {
    try {
      const result = await client.send(
        new DescribeUserPoolClientCommand({
          UserPoolId: userPoolId,
          ClientId: clientId,
        }),
      );
      res.push(result);
    } catch (e) {
      console.error(`Failed to fetch client ${clientId}:`, e);
    }
  }

  return res;
};

export const getTable = async (tableName: string, region: string): Promise<DescribeTableCommandOutput> => {
  return getDDBTable(tableName, region)!;
};

export const putItemInTable = async (tableName: string, region: string, item: unknown): Promise<PutCommandOutput> => {
  const client = new DynamoDBClient({ region });
  const ddb = DynamoDBDocumentClient.from(client);

  return await ddb.send(new PutCommand({ TableName: tableName, Item: item }));
};

export const scanTable = async (tableName: string, region: string): Promise<ScanCommandOutput> => {
  const client = new DynamoDBClient({ region });
  const ddb = DynamoDBDocumentClient.from(client);

  return await ddb.send(new ScanCommand({ TableName: tableName }));
};

export const getAppSyncApi = async (appSyncApiId: string, region: string): Promise<GetGraphqlApiCommandOutput> => {
  const client = new AppSyncClient({ region });
  return await client.send(new GetGraphqlApiCommand({ apiId: appSyncApiId }));
};

export const listAppSyncFunctions = async (appSyncApiId: string, region: string): Promise<ListFunctionsCommandOutput> => {
  const client = new AppSyncClient({ region });
  return await client.send(new ListFunctionsCommand({ apiId: appSyncApiId }));
};

export const describeCloudFormationStack = async (stackName: string, region: string, profileConfig?: any): Promise<Stack> => {
  const client = profileConfig ? new CloudFormationClient({ ...profileConfig, region }) : new CloudFormationClient({ region });
  const stacksDescription = await client.send(new DescribeStacksCommand({ StackName: stackName }));
  return stacksDescription.Stacks.find((stack) => stack.StackName === stackName || stack.StackId === stackName);
};

export const getNestedStackID = async (stackName: string, region: string, logicalId: string): Promise<string> => {
  const client = new CloudFormationClient({ region });
  const resource = await client.send(new DescribeStackResourcesCommand({ StackName: stackName, LogicalResourceId: logicalId }));
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
  const client = new CloudFormationClient({ region });
  const apiResources = await client.send(new DescribeStackResourcesCommand({ StackName: StackId }));
  const resource = apiResources.StackResources.find((stackResource) => table === stackResource.LogicalResourceId);
  if (resource) {
    const tableStack = await client.send(new DescribeStacksCommand({ StackName: resource.PhysicalResourceId }));
    if (tableStack?.Stacks?.length > 0) {
      const tableName = tableStack.Stacks[0].Outputs.find((out) => out.OutputKey === `GetAtt${resource.LogicalResourceId}TableName`);
      return tableName.OutputValue;
    }
  }
  return null;
};

export const setupAmplifyAdminUI = async (appId: string, region: string): Promise<CreateBackendConfigCommandOutput> => {
  const client = new AmplifyBackendClient({ region });
  return await client.send(new CreateBackendConfigCommand({ AppId: appId }));
};

export const getAmplifyBackendJobStatus = async (
  jobId: string,
  appId: string,
  envName: string,
  region: string,
): Promise<GetBackendJobCommandOutput> => {
  const client = new AmplifyBackendClient({ region });
  return await client.send(
    new GetBackendJobCommand({
      JobId: jobId,
      AppId: appId,
      BackendEnvironmentName: envName,
    }),
  );
};

export const listRolePolicies = async (roleName: string, region: string): Promise<string[]> => {
  const client = new IAMClient({ region });
  return (await client.send(new ListRolePoliciesCommand({ RoleName: roleName }))).PolicyNames;
};

export const listAttachedRolePolicies = async (roleName: string, region: string): Promise<AttachedPolicy[]> => {
  const client = new IAMClient({ region });
  return (await client.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }))).AttachedPolicies;
};

export const getBucketNameFromModelSchemaS3Uri = (uri: string | null): string | null => {
  const pattern = /(s3:\/\/)(.*)(\/.*)/;
  const matches = uri.match(pattern);
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
  const corsPolicy = await client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
  return corsPolicy.CORSRules;
};
