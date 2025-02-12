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

const functionIdValueMap: Record<string, string> = {};

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
  const client = new AppSyncClient({});

  let nextToken: string | undefined = undefined;
  const typeNames: string[] = [];
  do {
    const input: ListTypesCommandInput = {
      apiId: process.env.API_ID,
      format: 'JSON',
      nextToken,
    };
    const command = new ListTypesCommand(input);
    const result = await client.send(command);
    nextToken = result.nextToken;

    if (!result.types || result.types.length === 0) {
      continue;
    }
    const localNames = result.types.map((type) => type.name).filter((name) => name !== undefined) as string[];
    typeNames.push(...localNames);
  } while (nextToken);

  return typeNames;
};

const deleteAllResolvers = async (): Promise<void> => {
  const client = new AppSyncClient({});
  const typeNames = await getAllTypeNames();

  let nextToken: string | undefined = undefined;
  const deleteResolverInputs: DeleteResolverCommandInput[] = [];
  do {
    const input: ListResolversCommandInput = {
      apiId: process.env.API_ID,
      typeName: typeNames.pop(),
      nextToken,
    };
    const command = new ListResolversCommand(input);
    const result = await client.send(command);
    nextToken = result.nextToken;
    if (!result.resolvers || result.resolvers.length === 0) {
      continue;
    }

    const localInputs = result.resolvers.map(
      (resolver): DeleteResolverCommandInput => ({
        apiId: process.env.API_ID,
        fieldName: resolver.fieldName,
        typeName: resolver.typeName,
      }),
    );

    deleteResolverInputs.push(...localInputs);
  } while (nextToken);

  for (const input of deleteResolverInputs) {
    const command = new DeleteResolverCommand(input);
    await client.send(command);
  }
};

const deleteAllFunctions = async (): Promise<void> => {
  const client = new AppSyncClient({});

  let nextToken: string | undefined = undefined;
  const functionIds: string[] = [];

  do {
    const input: ListFunctionsCommandInput = {
      apiId: process.env.API_ID,
      nextToken,
    };
    const command = new ListFunctionsCommand(input);

    const result = await client.send(command);
    nextToken = result.nextToken;

    if (!result.functions || result.functions.length === 0) {
      continue;
    }
    const localIds = result.functions.map((func) => func.functionId).filter((id) => id !== undefined) as string[];
    functionIds.push(...localIds);
  } while (nextToken);

  for (const functionId of functionIds) {
    const input: DeleteFunctionCommandInput = {
      apiId: process.env.API_ID,
      functionId,
    };
    const command = new DeleteFunctionCommand(input);
    await client.send(command);
  }
};

const createFunctions = async (metadata: any): Promise<void> => {
  const client = new AppSyncClient({});
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
    const appSyncFunction = await client.send(createFunctionCommand);
    functionIdValueMap[metadata[func].functionId] = appSyncFunction.functionConfiguration!.functionId!;
  }
};

const createResolvers = async (metadata: any): Promise<void> => {
  const client = new AppSyncClient({});
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
    await client.send(createResolverCommand);
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
  const client = new S3Client({});

  try {
    const response = await client.send(
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
  const computedResources = await getJsonFromS3<any>(bucket, key);
  return computedResources;
};
