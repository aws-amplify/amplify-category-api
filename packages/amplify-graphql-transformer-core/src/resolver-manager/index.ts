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

const functionIdValueMap: Record<string, string> = {};

export const handler = async (event: any): Promise<any> => {
  const metadata: any = JSON.parse(fs.readFileSync('./computed-resources.json', 'utf8'));
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
