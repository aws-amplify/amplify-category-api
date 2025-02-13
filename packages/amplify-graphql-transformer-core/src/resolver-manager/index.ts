import { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from 'aws-lambda';
import {
  AppSyncClient,
  CreateFunctionCommand,
  CreateResolverCommand,
  DeleteFunctionCommand,
  DeleteFunctionCommandInput,
  DeleteResolverCommand,
  DeleteResolverCommandInput,
  ListFunctionsCommand,
  ListFunctionsCommandInput,
  ListResolversCommand,
  ListResolversCommandInput,
  ListTypesCommand,
  ListTypesCommandInput,
} from '@aws-sdk/client-appsync';
import { S3Client, GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';

interface ResolverSpec {
  typeName: string;
  fieldName: string | undefined;
}

interface ResourceProperties {
  ServiceToken: string;
  apiId: string;
  computedResourcesAssetUrl: string;
  resourceHash: string;
  resources?: any;
}

const functionIdValueMap: Record<string, string> = {};

const appSyncClient = new AppSyncClient({});

export const handler = async (event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> => {
  console.log('event', JSON.stringify(event));

  // Initial resource properties come from the CFN event
  const resourceProperties = event.ResourceProperties as ResourceProperties;

  // Enrich the initial properties with the actual resource shape from S3
  const resources = await getComputedResources(resourceProperties);
  resourceProperties.resources = resources;

  // TODO: Figure out a diff strategy for the resources so we don't have to delete/recreate every time
  console.log('Delete all resolvers');
  await deleteAllResolvers(resourceProperties);

  console.log('Delete all functions');
  await deleteAllFunctions(resourceProperties);

  const physicalResourceId = `resource-manager-${resourceProperties.apiId}`;

  switch (event.RequestType) {
    case 'Create':
    case 'Update':
      console.log('Create/Update event');
      await createFunctions(resourceProperties);
      await createResolvers(resourceProperties);
      break;
    case 'Delete':
      console.log('Delete event');
      break;
  }

  const response: CloudFormationCustomResourceResponse = {
    PhysicalResourceId: physicalResourceId,
    Status: 'SUCCESS',
    Data: {
      ...resourceProperties,
    },
    LogicalResourceId: event.LogicalResourceId,
    RequestId: event.RequestId,
    StackId: event.StackId,
  };

  return response;
};

const getAllTypeNames = async (resourceProperties: ResourceProperties): Promise<string[]> => {
  const { apiId } = resourceProperties;

  let nextToken: string | undefined = undefined;
  const typeNames: string[] = [];
  do {
    const input: ListTypesCommandInput = {
      apiId,
      format: 'JSON',
      nextToken,
    };
    const command = new ListTypesCommand(input);
    const result = await appSyncClient.send(command);
    nextToken = result.nextToken;

    console.log('getAllTypeNames result:', JSON.stringify(result));

    if (!result.types || result.types.length === 0) {
      continue;
    }
    const localNames = result.types.map((type) => type.name).filter((name) => name !== undefined) as string[];

    console.log('getAllTypeNames localNames:', JSON.stringify(localNames));

    typeNames.push(...localNames);
  } while (nextToken);

  console.log('getAllTypeNames all typeNames:', JSON.stringify(typeNames));

  return typeNames;
};

const getAllResolverSpecForType = async (typeName: string, resourceProperties: ResourceProperties): Promise<ResolverSpec[]> => {
  const { apiId } = resourceProperties;

  let nextToken: string | undefined = undefined;
  const resolverSpecs: ResolverSpec[] = [];
  do {
    const input: ListResolversCommandInput = {
      apiId,
      typeName: typeName,
      nextToken,
    };
    const command = new ListResolversCommand(input);
    const result = await appSyncClient.send(command);
    nextToken = result.nextToken;
    const localResolvers = result.resolvers ?? [];
    if (localResolvers.length === 0) {
      continue;
    }

    localResolvers.forEach((resolver) => {
      resolverSpecs.push({ typeName, fieldName: resolver.fieldName });
    });
  } while (nextToken);

  return resolverSpecs;
};

const deleteAllResolvers = async (resourceProperties: ResourceProperties): Promise<void> => {
  const { apiId } = resourceProperties;

  const typeNames = await getAllTypeNames(resourceProperties);

  const allResolverSpecs: ResolverSpec[] = [];
  for (const typeName of typeNames) {
    const resolvers = await getAllResolverSpecForType(typeName, resourceProperties);
    allResolverSpecs.push(...resolvers);
  }

  console.log('deleteAllResolvers allResolverSpecs:', JSON.stringify(allResolverSpecs));

  const allPromises = [];
  for (const resolverSpec of allResolverSpecs) {
    const input: DeleteResolverCommandInput = {
      apiId,
      typeName: resolverSpec.typeName,
      fieldName: resolverSpec.fieldName,
    };
    const command = new DeleteResolverCommand(input);
    allPromises.push(appSyncClient.send(command));
  }

  await Promise.all(allPromises);
  console.log('Done deleting all resolvers');
};

const deleteAllFunctions = async (resourceProperties: ResourceProperties): Promise<void> => {
  const { apiId } = resourceProperties;
  let nextToken: string | undefined = undefined;
  const functionIds: string[] = [];

  do {
    const input: ListFunctionsCommandInput = {
      apiId,
      nextToken,
    };
    const command = new ListFunctionsCommand(input);

    const result = await appSyncClient.send(command);
    nextToken = result.nextToken;

    if (!result.functions || result.functions.length === 0) {
      continue;
    }
    const localIds = result.functions.map((func) => func.functionId).filter((id) => id !== undefined) as string[];
    functionIds.push(...localIds);
  } while (nextToken);

  console.log('deleteAllFunctions functionIds:', JSON.stringify(functionIds));

  const allPromises = [];
  for (const functionId of functionIds) {
    const input: DeleteFunctionCommandInput = {
      apiId,
      functionId,
    };
    const command = new DeleteFunctionCommand(input);
    allPromises.push(appSyncClient.send(command));
  }

  await Promise.all(allPromises);
  console.log('Done deleting all functions');
};

const createFunctions = async (resourceProperties: ResourceProperties): Promise<void> => {
  const { apiId, resources } = resourceProperties;

  for (const func of Object.keys(resources)) {
    if (resources[func].type !== 'AppSyncFunction') {
      continue;
    }
    console.log(`Creating function ${func}`);
    const createFunctionCommand = new CreateFunctionCommand({
      apiId,
      dataSourceName: resources[func].dataSource,
      name: func,
      requestMappingTemplate: resources[func].requestMappingTemplate,
      responseMappingTemplate: resources[func].responseMappingTemplate,
      functionVersion: '2018-05-29',
    });
    const appSyncFunction = await appSyncClient.send(createFunctionCommand);
    functionIdValueMap[resources[func].functionId] = appSyncFunction.functionConfiguration!.functionId!;
  }
};

const createResolvers = async (resourceProperties: ResourceProperties): Promise<void> => {
  const { apiId, resources } = resourceProperties;

  console.log('Create resolvers');
  console.log(JSON.stringify(functionIdValueMap, null, 2));
  for (const resolver of Object.keys(resources)) {
    if (resources[resolver].type !== 'Resolver') {
      continue;
    }
    console.log(`Creating resolver for field ${resources[resolver].fieldName} on type ${resources[resolver].typeName}`);
    const createResolverCommand = new CreateResolverCommand({
      apiId,
      fieldName: resources[resolver].fieldName,
      typeName: resources[resolver].typeName,
      kind: 'PIPELINE',
      dataSourceName: resources[resolver].dataSource,
      requestMappingTemplate: resources[resolver].requestMappingTemplate,
      responseMappingTemplate: resources[resolver].responseMappingTemplate,
      pipelineConfig: {
        functions: resources[resolver].pipelineConfig.functions?.map((x: string) => functionIdValueMap[x]),
      },
    });
    await appSyncClient.send(createResolverCommand);
  }
};

const getComputedResources = async (resourceProperties: ResourceProperties): Promise<any> => {
  const { computedResourcesAssetUrl } = resourceProperties;
  const { bucket, key } = parseS3Url(computedResourcesAssetUrl);
  console.log(`getComputedResources: ${bucket}/${key}`);
  const computedResources = await getJsonFromS3<any>(bucket, key);
  return computedResources;
};

const parseS3Url = (s3Url: string): { bucket: string; key: string; versionId?: string } => {
  try {
    const url = new URL(s3Url);

    // Check if it's a valid s3:// URL
    if (url.protocol !== 's3:') {
      throw new Error(`Invalid S3 URL: ${s3Url}`);
    }

    // Get version ID if present
    const versionId = url.searchParams.get('versionId') ?? undefined;

    return {
      bucket: url.hostname,
      key: url.pathname.slice(1), // Remove leading slash
      ...(versionId && { versionId }),
    };
  } catch (err) {
    throw new Error(`Invalid S3 URL: ${s3Url}`);
  }
};

const getJsonFromS3 = async <T>(bucket: string, key: string): Promise<T> => {
  const s3Client = new S3Client({});
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error('Empty response body');
    }

    const bodyContents = await response.Body.transformToString();

    try {
      return JSON.parse(bodyContents) as T;
    } catch (parseError) {
      console.log('Failed to parse JSON');
      console.log(parseError);
      return {} as T;
      // throw new Error(`Failed to parse JSON: ${parseError.message}`);
    }
  } catch (error) {
    if (error instanceof NoSuchKey) {
      throw new Error(`File not found in bucket ${bucket} with key ${key}`);
    }
    throw error;
  }
};
