import * as fs from 'fs';
import {
  AppSyncClient,
  DeleteFunctionCommand,
  DeleteResolverCommand,
  ListFunctionsCommand,
  ListResolversCommand,
  CreateResolverCommand,
  CreateFunctionCommand,
} from '@aws-sdk/client-appsync';
import { S3Client, GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';

const functionIdValueMap: Record<string, string> = {};

export const handler = async (event: any): Promise<any> => {
  const metadata: any = await getComputedResources();
  // for (const [k, v] of Object.entries(metadata)) {
  //   if ((v as any).type !== 'Function') {
  //     continue;
  //   }
  //   functionIdNameMap[(v as any).functionId] = k;
  // }
  console.log('Delete all resolvers');
  await deleteAllResolvers(metadata);
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

const deleteAllResolvers = async (metadata: any): Promise<void> => {
  const client = new AppSyncClient({});
  const typeNames = Object.values(metadata)
    .filter((x: any) => x.type === 'Resolver')
    .map((x: any) => x.typeName);
  for (const typeName of typeNames) {
    // Get the resolvers
    const listResolversCommand = new ListResolversCommand({
      apiId: process.env.API_ID,
      typeName: typeName,
    });
    const result = await client.send(listResolversCommand);

    // Delete the resolvers
    for (const resolver of result.resolvers ?? []) {
      const deleteResolverCommand = new DeleteResolverCommand({
        apiId: process.env.API_ID,
        fieldName: resolver.fieldName,
        typeName: resolver.typeName,
      });
      await client.send(deleteResolverCommand);
    }
  }
};

const deleteAllFunctions = async (): Promise<void> => {
  const client = new AppSyncClient({});

  // Get the functions
  const listFunctionsCommand = new ListFunctionsCommand({
    apiId: process.env.API_ID,
  });
  const result = await client.send(listFunctionsCommand);

  // Delete the functions
  for (const func of result.functions ?? []) {
    const deleteFunctionCommand = new DeleteFunctionCommand({
      apiId: process.env.API_ID,
      functionId: func.functionId,
    });
    await client.send(deleteFunctionCommand);
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

function parseS3Url(s3Url: string): { bucket: string; key: string; versionId?: string } {
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
}

// async function getJsonFromS3<T>(bucket: string, key: string): Promise<T> {
//   const s3 = new S3();

//   try {
//     const object = await s3.getObject({
//       Bucket: bucket,
//       Key: key,
//     });

//     if (!object.Body) {
//       throw new Error('Empty response body');
//     }

//     try {
//       return JSON.parse(object.Body.toString()) as T;
//     } catch (parseError) {
//       console.log('Failed to parse JSON');
//       console.log(object.Body);
//       console.log(object.Body.toString());
//       return {} as T;
//       // throw new Error(`Failed to parse JSON: ${parseError.message}`);
//     }
//   } catch (error) {
//     if (error instanceof NoSuchKey) {
//       throw new Error(`File not found in bucket ${bucket} with key ${key}`);
//     }
//     throw error;
//   }
// }

async function getJsonFromS3<T>(bucket: string, key: string): Promise<T> {
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
}

async function getComputedResources(): Promise<any> {
  const { bucket, key } = parseS3Url(process.env.resolverCodeAsset!);
  const computedResources = await getJsonFromS3<any>(bucket, key);
  return computedResources;
}
