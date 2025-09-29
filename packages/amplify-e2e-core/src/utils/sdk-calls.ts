import {
  S3Client,
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
  DeleteBucketCommand,
  HeadBucketCommand,
  GetBucketCorsCommand,
  waitUntilBucketNotExists,
} from '@aws-sdk/client-s3';
import { DynamoDBClient, DescribeTableCommand, ListTagsOfResourceCommand, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { AppSyncClient, GetGraphqlApiCommand, ListFunctionsCommand } from '@aws-sdk/client-appsync';
import { CloudFormationClient, DescribeStacksCommand, DescribeStackResourcesCommand } from '@aws-sdk/client-cloudformation';
import { AmplifyBackendClient, CreateBackendConfigCommand, GetBackendJobCommand } from '@aws-sdk/client-amplifybackend';
import {
  IAMClient,
  ListRolesCommand,
  GetRolePolicyCommand,
  ListRolePoliciesCommand,
  ListAttachedRolePoliciesCommand,
} from '@aws-sdk/client-iam';
import _ from 'lodash';

export const getDDBTable = async (tableName: string, region: string) => {
  const service = new DynamoDBClient({ region });
  if (tableName) {
    return await service.send(new DescribeTableCommand({ TableName: tableName }));
  }
};

export const getDDBTableTags = async (tableName: string, region: string) => {
  const service = new DynamoDBClient({ region });
  return await service.send(new ListTagsOfResourceCommand({ ResourceArn: tableName }));
};

export const checkIfBucketExists = async (bucketName: string, region: string) => {
  const service = new S3Client({ region });
  return await service.send(new HeadBucketCommand({ Bucket: bucketName }));
};

export const bucketNotExists = async (bucket: string) => {
  const s3 = new S3Client({});
  try {
    await waitUntilBucketNotExists({ client: s3, maxWaitTime: 300, minDelay: 30, maxDelay: 30 }, { Bucket: bucket });
    return true;
  } catch (error) {
    if (error.statusCode === 200) {
      return false;
    }
    throw error;
  }
};

export const deleteS3Bucket = async (bucket: string, providedS3Client: S3Client | undefined = undefined) => {
  const s3 = providedS3Client ? providedS3Client : new S3Client({});
  let continuationToken: { KeyMarker?: string; VersionIdMarker?: string } = {};
  const objectKeyAndVersion: { Key: string; VersionId?: string }[] = [];
  let truncated = false;
  do {
    const results = await s3.send(
      new ListObjectVersionsCommand({
        Bucket: bucket,
        ...continuationToken,
      }),
    );

    results.Versions?.forEach(({ Key, VersionId }) => {
      if (Key) objectKeyAndVersion.push({ Key, VersionId });
    });

    results.DeleteMarkers?.forEach(({ Key, VersionId }) => {
      if (Key) objectKeyAndVersion.push({ Key, VersionId });
    });

    continuationToken = { KeyMarker: results.NextKeyMarker, VersionIdMarker: results.NextVersionIdMarker };
    truncated = results.IsTruncated;
  } while (truncated);
  const chunkedResult = _.chunk(objectKeyAndVersion, 1000);
  const deleteReq = chunkedResult
    .map((r) => {
      return {
        Bucket: bucket,
        Delete: {
          Objects: r,
          Quiet: true,
        },
      };
    })
    .map((delParams) => s3.send(new DeleteObjectsCommand(delParams)));
  await Promise.all(deleteReq);
  await s3.send(
    new DeleteBucketCommand({
      Bucket: bucket,
    }),
  );
  await bucketNotExists(bucket);
};

export const getUserPool = async (userpoolId, region) => {
  let res;
  try {
    const client = new CognitoIdentityProviderClient({ region });
    res = await client.send(new DescribeUserPoolCommand({ UserPoolId: userpoolId }));
  } catch (e) {
    console.log(e);
  }
  return res;
};

export const getLambdaFunction = async (functionName: string, region: string) => {
  const lambda = new LambdaClient({ region });
  try {
    return await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
  } catch (e) {
    console.log(e);
  }
};

export const getUserPoolClients = async (userPoolId: string, clientIds: string[], region: string) => {
  const provider = new CognitoIdentityProviderClient({ region });
  const res = [];
  try {
    for (let i = 0; i < clientIds.length; i++) {
      const clientData = await provider.send(
        new DescribeUserPoolClientCommand({
          UserPoolId: userPoolId,
          ClientId: clientIds[i],
        }),
      );
      res.push(clientData);
    }
  } catch (e) {
    console.log(e);
  }
  return res;
};

export const getTable = async (tableName: string, region: string) => {
  const service = new DynamoDBClient({ region });
  return await service.send(new DescribeTableCommand({ TableName: tableName }));
};

export const putItemInTable = async (tableName: string, region: string, item: unknown) => {
  const ddb = new DynamoDBClient({ region });
  return await ddb.send(new PutItemCommand({ TableName: tableName, Item: item as any }));
};

export const scanTable = async (tableName: string, region: string) => {
  const ddb = new DynamoDBClient({ region });
  return await ddb.send(new ScanCommand({ TableName: tableName }));
};

export const getAppSyncApi = async (appSyncApiId: string, region: string) => {
  const service = new AppSyncClient({ region });
  return await service.send(new GetGraphqlApiCommand({ apiId: appSyncApiId }));
};

export const listAppSyncFunctions = async (appSyncApiId: string, region: string) => {
  const service = new AppSyncClient({ region });
  return await service.send(new ListFunctionsCommand({ apiId: appSyncApiId }));
};

export const describeCloudFormationStack = async (stackName: string, region: string, profileConfig?: any) => {
  const service = profileConfig ? new CloudFormationClient({ ...profileConfig, region }) : new CloudFormationClient({ region });
  const result = await service.send(new DescribeStacksCommand({ StackName: stackName }));
  return result.Stacks.find((stack) => stack.StackName === stackName || stack.StackId === stackName);
};

export const getNestedStackID = async (stackName: string, region: string, logicalId: string): Promise<string> => {
  const cfnClient = new CloudFormationClient({ region });
  const resource = await cfnClient.send(new DescribeStackResourcesCommand({ StackName: stackName, LogicalResourceId: logicalId }));
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
  const cfnClient = new CloudFormationClient({ region });
  const apiResources = await cfnClient.send(
    new DescribeStackResourcesCommand({
      StackName: StackId,
    }),
  );
  const resource = apiResources.StackResources.find((stackResource) => table === stackResource.LogicalResourceId);
  if (resource) {
    const tableStack = await cfnClient.send(new DescribeStacksCommand({ StackName: resource.PhysicalResourceId }));
    if (tableStack?.Stacks?.length > 0) {
      const tableName = tableStack.Stacks[0].Outputs.find((out) => out.OutputKey === `GetAtt${resource.LogicalResourceId}TableName`);
      return tableName.OutputValue;
    }
  }
  return null;
};

export const setupAmplifyAdminUI = async (appId: string, region: string) => {
  const amplifyBackend = new AmplifyBackendClient({ region });

  return await amplifyBackend.send(new CreateBackendConfigCommand({ AppId: appId }));
};

export const getAmplifyBackendJobStatus = async (jobId: string, appId: string, envName: string, region: string) => {
  const amplifyBackend = new AmplifyBackendClient({ region });

  return await amplifyBackend.send(
    new GetBackendJobCommand({
      JobId: jobId,
      AppId: appId,
      BackendEnvironmentName: envName,
    }),
  );
};

export const listRoleNamesContaining = async (searchString: string, region: string): Promise<string[]> => {
  const service = new IAMClient({ region });

  const roles: string[] = [];
  let isTruncated = true;
  let marker: string | undefined;

  while (isTruncated) {
    const params = marker ? { Marker: marker } : {};
    const response = await service.send(new ListRolesCommand(params));

    const matchingRoles = response.Roles.filter((role) => role.RoleName.includes(searchString));
    roles.push(...matchingRoles.map((r) => r.RoleName));

    isTruncated = response.IsTruncated;
    marker = response.Marker;
  }

  return roles;
};

export const getRolePolicy = async (roleName: string, policyName: string, region: string): Promise<any> => {
  const service = new IAMClient({ region });
  const result = await service.send(new GetRolePolicyCommand({ PolicyName: policyName, RoleName: roleName }));
  const decodedDocument = decodeURIComponent(result.PolicyDocument);
  return JSON.parse(decodedDocument);
};

export const listRolePolicies = async (roleName: string, region: string): Promise<string[]> => {
  const service = new IAMClient({ region });
  const result = await service.send(new ListRolePoliciesCommand({ RoleName: roleName }));
  return result.PolicyNames;
};

export const listAttachedRolePolicies = async (roleName: string, region: string) => {
  const service = new IAMClient({ region });
  const result = await service.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }));
  return result.AttachedPolicies;
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
  const service = new S3Client({ region });
  const corsPolicy = await service.send(new GetBucketCorsCommand({ Bucket: bucketName }));
  return corsPolicy.CORSRules;
};
