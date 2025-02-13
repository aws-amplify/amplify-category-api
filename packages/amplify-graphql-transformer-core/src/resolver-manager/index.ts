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

const functionIdValueMap: Record<string, string> = {};

const appSyncClient = new AppSyncClient({});

export const handler = async (event: any): Promise<any> => {
  console.log('event', JSON.stringify(event));
  const metadata: any = await getComputedResources();

  console.log('Delete all resolvers');
  await deleteAllResolvers();

  console.log('Delete all functions');
  await deleteAllFunctions();

  switch (event.RequestType) {
    case 'Create':
    case 'Update':
      console.log('Create/Update event');
      await createFunctions(metadata);
      await createResolvers(metadata);
      break;
    case 'Delete':
      console.log('Delete event');
      break;
  }
};

const getAllTypeNames = async (): Promise<string[]> => {
  let nextToken: string | undefined = undefined;
  const typeNames: string[] = [];
  do {
    const input: ListTypesCommandInput = {
      apiId: process.env.API_ID,
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

const getAllResolverSpecForType = async (typeName: string): Promise<ResolverSpec[]> => {
  let nextToken: string | undefined = undefined;
  const resolverSpecs: ResolverSpec[] = [];
  do {
    const input: ListResolversCommandInput = {
      apiId: process.env.API_ID,
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

const deleteAllResolvers = async (): Promise<void> => {
  const typeNames = await getAllTypeNames();

  const allResolverSpecs: ResolverSpec[] = [];
  for (const typeName of typeNames) {
    const resolvers = await getAllResolverSpecForType(typeName);
    allResolverSpecs.push(...resolvers);
  }

  console.log('deleteAllResolvers allResolverSpecs:', JSON.stringify(allResolverSpecs));

  const allPromises = [];
  for (const resolverSpec of allResolverSpecs) {
    const input: DeleteResolverCommandInput = {
      apiId: process.env.API_ID,
      typeName: resolverSpec.typeName,
      fieldName: resolverSpec.fieldName,
    };
    const command = new DeleteResolverCommand(input);
    allPromises.push(appSyncClient.send(command));
  }

  await Promise.all(allPromises);
  console.log('Done deleting all resolvers');
};

const deleteAllFunctions = async (): Promise<void> => {
  let nextToken: string | undefined = undefined;
  const functionIds: string[] = [];

  do {
    const input: ListFunctionsCommandInput = {
      apiId: process.env.API_ID,
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
      apiId: process.env.API_ID,
      functionId,
    };
    const command = new DeleteFunctionCommand(input);
    allPromises.push(appSyncClient.send(command));
  }

  await Promise.all(allPromises);
  console.log('Done deleting all functions');
};

const createFunctions = async (metadata: any): Promise<void> => {
  for (const func of Object.keys(metadata)) {
    if (metadata[func].type !== 'AppSyncFunction') {
      continue;
    }
    console.log(`Creating function ${func}`);
    const createFunctionCommand = new CreateFunctionCommand({
      apiId: process.env.API_ID,
      dataSourceName: metadata[func].dataSource,
      name: func,
      requestMappingTemplate: metadata[func].requestMappingTemplate,
      responseMappingTemplate: metadata[func].responseMappingTemplate,
      functionVersion: '2018-05-29',
    });
    const appSyncFunction = await appSyncClient.send(createFunctionCommand);
    functionIdValueMap[metadata[func].functionId] = appSyncFunction.functionConfiguration!.functionId!;
  }
};

const createResolvers = async (metadata: any): Promise<void> => {
  console.log('Create resolvers');
  console.log(JSON.stringify(functionIdValueMap, null, 2));
  for (const resolver of Object.keys(metadata)) {
    if (metadata[resolver].type !== 'Resolver') {
      continue;
    }
    console.log(`Creating resolver for field ${metadata[resolver].fieldName} on type ${metadata[resolver].typeName}`);
    const createResolverCommand = new CreateResolverCommand({
      apiId: process.env.API_ID,
      fieldName: metadata[resolver].fieldName,
      typeName: metadata[resolver].typeName,
      kind: 'PIPELINE',
      dataSourceName: metadata[resolver].dataSource,
      requestMappingTemplate: metadata[resolver].requestMappingTemplate,
      responseMappingTemplate: metadata[resolver].responseMappingTemplate,
      pipelineConfig: {
        functions: metadata[resolver].pipelineConfig.functions?.map((x: string) => functionIdValueMap[x]),
      },
    });
    await appSyncClient.send(createResolverCommand);
  }
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

const getComputedResources = async (): Promise<any> => {
  const { bucket, key } = parseS3Url(process.env.resolverCodeAsset!);
  console.log(`getComputedResources: ${bucket}/${key}`);
  const computedResources = await getJsonFromS3<any>(bucket, key);
  return computedResources;
};
