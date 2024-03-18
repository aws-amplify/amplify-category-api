import { config, DynamoDB, S3, CognitoIdentityServiceProvider, Lambda, AppSync, CloudFormation, AmplifyBackend, IAM } from 'aws-sdk';
import _ from 'lodash';

export const getDDBTable = async (tableName: string, region: string) => {
  const service = new DynamoDB({ region });
  if (tableName) {
    return await service.describeTable({ TableName: tableName }).promise();
  }
};

export const checkIfBucketExists = async (bucketName: string, region: string) => {
  const service = new S3({ region });
  return await service.headBucket({ Bucket: bucketName }).promise();
};

export const bucketNotExists = async (bucket: string) => {
  const s3 = new S3();
  const params = {
    Bucket: bucket,
    $waiter: { maxAttempts: 10, delay: 30 },
  };
  try {
    await s3.waitFor('bucketNotExists', params).promise();
    return true;
  } catch (error) {
    if (error.statusCode === 200) {
      return false;
    }
    throw error;
  }
};

export const deleteS3Bucket = async (bucket: string, providedS3Client: S3 | undefined = undefined) => {
  const s3 = providedS3Client ? providedS3Client : new S3();
  let continuationToken: Required<Pick<S3.ListObjectVersionsOutput, 'KeyMarker' | 'VersionIdMarker'>> = undefined;
  const objectKeyAndVersion = <S3.ObjectIdentifier[]>[];
  let truncated = false;
  do {
    const results = await s3
      .listObjectVersions({
        Bucket: bucket,
        ...continuationToken,
      })
      .promise();

    results.Versions?.forEach(({ Key, VersionId }) => {
      objectKeyAndVersion.push({ Key, VersionId });
    });

    results.DeleteMarkers?.forEach(({ Key, VersionId }) => {
      objectKeyAndVersion.push({ Key, VersionId });
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
    .map((delParams) => s3.deleteObjects(delParams).promise());
  await Promise.all(deleteReq);
  await s3
    .deleteBucket({
      Bucket: bucket,
    })
    .promise();
  await bucketNotExists(bucket);
};

export const getUserPool = async (userpoolId, region) => {
  config.update({ region });
  let res;
  try {
    res = await new CognitoIdentityServiceProvider().describeUserPool({ UserPoolId: userpoolId }).promise();
  } catch (e) {
    console.log(e);
  }
  return res;
};

export const getLambdaFunction = async (functionName: string, region: string) => {
  const lambda = new Lambda({ region });
  try {
    return await lambda.getFunction({ FunctionName: functionName }).promise();
  } catch (e) {
    console.log(e);
  }
};

export const getUserPoolClients = async (userPoolId: string, clientIds: string[], region: string) => {
  const provider = new CognitoIdentityServiceProvider({ region });
  const res = [];
  try {
    for (let i = 0; i < clientIds.length; i++) {
      const clientData = await provider
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
  const service = new DynamoDB({ region });
  return await service.describeTable({ TableName: tableName }).promise();
};

export const putItemInTable = async (tableName: string, region: string, item: unknown) => {
  const ddb = new DynamoDB.DocumentClient({ region });
  return await ddb.put({ TableName: tableName, Item: item }).promise();
};

export const scanTable = async (tableName: string, region: string) => {
  const ddb = new DynamoDB.DocumentClient({ region });
  return await ddb.scan({ TableName: tableName }).promise();
};

export const getAppSyncApi = async (appSyncApiId: string, region: string) => {
  const service = new AppSync({ region });
  return await service.getGraphqlApi({ apiId: appSyncApiId }).promise();
};

export const listAppSyncFunctions = async (appSyncApiId: string, region: string) => {
  const service = new AppSync({ region });
  return await service.listFunctions({ apiId: appSyncApiId }).promise();
};

export const describeCloudFormationStack = async (stackName: string, region: string, profileConfig?: any) => {
  const service = profileConfig ? new CloudFormation({ ...profileConfig, region }) : new CloudFormation({ region });
  return (await service.describeStacks({ StackName: stackName }).promise()).Stacks.find(
    (stack) => stack.StackName === stackName || stack.StackId === stackName,
  );
};

export const getNestedStackID = async (stackName: string, region: string, logicalId: string): Promise<string> => {
  const cfnClient = new CloudFormation({ region });
  const resource = await cfnClient.describeStackResources({ StackName: stackName, LogicalResourceId: logicalId }).promise();
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
  const cfnClient = new CloudFormation({ region });
  const apiResources = await cfnClient
    .describeStackResources({
      StackName: StackId,
    })
    .promise();
  const resource = apiResources.StackResources.find((stackResource) => table === stackResource.LogicalResourceId);
  if (resource) {
    const tableStack = await cfnClient.describeStacks({ StackName: resource.PhysicalResourceId }).promise();
    if (tableStack?.Stacks?.length > 0) {
      const tableName = tableStack.Stacks[0].Outputs.find((out) => out.OutputKey === `GetAtt${resource.LogicalResourceId}TableName`);
      return tableName.OutputValue;
    }
  }
  return null;
};

export const setupAmplifyAdminUI = async (appId: string, region: string) => {
  const amplifyBackend = new AmplifyBackend({ region });

  return await amplifyBackend.createBackendConfig({ AppId: appId }).promise();
};

export const getAmplifyBackendJobStatus = async (jobId: string, appId: string, envName: string, region: string) => {
  const amplifyBackend = new AmplifyBackend({ region });

  return await amplifyBackend
    .getBackendJob({
      JobId: jobId,
      AppId: appId,
      BackendEnvironmentName: envName,
    })
    .promise();
};

export const listRolePolicies = async (roleName: string, region: string) => {
  const service = new IAM({ region });
  return (await service.listRolePolicies({ RoleName: roleName }).promise()).PolicyNames;
};

export const listAttachedRolePolicies = async (roleName: string, region: string) => {
  const service = new IAM({ region });
  return (await service.listAttachedRolePolicies({ RoleName: roleName }).promise()).AttachedPolicies;
};

export const getBucketNameFromModelSchemaS3Uri = (uri: string | null): string => {
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
  const HOST_INDEX = 2;
  if (!matches) {
    return null;
  }
  if (matches.length && matches.length > 2) {
    return matches[HOST_INDEX];
  }
  return null;
};

export const getBucketCorsPolicy = async (bucketName: string, region: string): Promise<Record<string, any>[]> => {
  const service = new S3({ region });
  const params = {
    Bucket: bucketName,
  };
  const corsPolicy = await service.getBucketCors(params).promise();
  return corsPolicy.CORSRules;
};
