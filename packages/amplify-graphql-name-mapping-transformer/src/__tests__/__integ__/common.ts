import { DeploymentResources } from '@aws-amplify/graphql-transformer-test-utils';

// indexes next to each resolver can help to match the resolver to the snapshot files
export const expectedResolversForModelWithRenamedField = (modelName: string): string[] => [
  // create resolver sequence
  `Mutation.create${modelName}.preUpdate.1.req.vtl`, // 1
  `Mutation.create${modelName}.preUpdate.2.req.vtl`, // 2
  `Mutation.create${modelName}.preUpdate.2.res.vtl`, // 3
  `Mutation.create${modelName}.postUpdate.1.res.vtl`, // 4

  // update resolver sequence
  `Mutation.update${modelName}.preUpdate.1.req.vtl`, // 5
  `Mutation.update${modelName}.preUpdate.2.req.vtl`, // 6
  `Mutation.update${modelName}.preUpdate.2.res.vtl`, // 7
  `Mutation.update${modelName}.postUpdate.1.res.vtl`, // 8

  // delete resolver sequence
  `Mutation.delete${modelName}.preUpdate.1.req.vtl`, // 9
  `Mutation.delete${modelName}.preUpdate.2.req.vtl`, // 10
  `Mutation.delete${modelName}.preUpdate.2.res.vtl`, // 11
  `Mutation.delete${modelName}.postUpdate.1.res.vtl`, // 12

  // get resolver sequence
  `Query.get${modelName}.postDataLoad.1.res.vtl`, // 13

  // list resolver sequence
  // NOTE: don't choose a test model name that is affected by improved pluralization
  `Query.list${modelName}s.preDataLoad.1.req.vtl`, // 14
  `Query.list${modelName}s.preDataLoad.1.res.vtl`, // 15
  `Query.list${modelName}s.postDataLoad.1.res.vtl`, // 16
];

export const expectedResolversForModelWithRefersTo = (modelName: string): string[] => [
  `Mutation.create${modelName}.req.vtl`,
  `Mutation.update${modelName}.req.vtl`,
  `Mutation.delete${modelName}.req.vtl`,
  `Query.get${modelName}.req.vtl`,
  `Query.list${modelName}s.req.vtl`,
];

export const expectedResolversForFieldWithRefersTo = (modelName: string): string[] => [
  `Mutation.create${modelName}.preAuth.2.req.vtl`,
  `Mutation.update${modelName}.preAuth.2.req.vtl`,
  `Mutation.delete${modelName}.preAuth.2.req.vtl`,
  `Query.get${modelName}.preAuth.2.req.vtl`,
  `Query.list${modelName}s.preAuth.2.req.vtl`,
];

export const testTableNameMapping = (modelName: string, tableName: string, out: DeploymentResources): void => {
  const expectedResolvers: string[] = expectedResolversForModelWithRefersTo(modelName);
  expectedResolvers.forEach((resolver) => {
    expect(out.resolvers[resolver]).toContain(`lambdaInput.table = "${tableName}"`);
    expect(out.resolvers[resolver]).toMatchSnapshot();
  });
};

export const testColumnNameMapping = (modelName: string, out: DeploymentResources): void => {
  const expectedResolvers: string[] = expectedResolversForFieldWithRefersTo(modelName);
  expectedResolvers.forEach((resolver) => {
    expect(out.resolvers[resolver]).toMatchSnapshot();
  });
};

export const testRelationalFieldMapping = (resolverName: string, tableName: string, out: DeploymentResources): void => {
  expect(out.resolvers[resolverName]).toContain(`lambdaInput.table = "${tableName}"`);
  expect(out.resolvers[resolverName]).toMatchSnapshot();
};

export const testRelationalNonScalarFieldsMapping = (resolverName: string, nonScalarFields: string, out: DeploymentResources): void => {
  expect(out.resolvers[resolverName]).toContain(`lambdaInput.args.metadata.nonScalarFields = ${nonScalarFields}`);
  expect(out.resolvers[resolverName]).toMatchSnapshot();
};

export const testRelationalArrayFieldsMapping = (resolverName: string, arrayFields: string, out: DeploymentResources): void => {
  expect(out.resolvers[resolverName]).toContain(`lambdaInput.args.metadata.arrayFields = ${arrayFields}`);
  expect(out.resolvers[resolverName]).toMatchSnapshot();
};
