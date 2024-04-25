import { doAppSyncGraphqlMutation, doAppSyncGraphqlQuery } from '../../../utils';
import {
  CreatePrimaryCPKSKOneInput,
  CreatePrimaryCPKSKTwoInput,
  CreatePrimaryInput,
  CreateRelatedOneCPKSKOneInput,
  CreateRelatedOneCPKSKTwoInput,
  CreateRelatedOneInput,
  GetPrimaryCPKSKOneQuery,
  GetPrimaryCPKSKTwoQuery,
  GetPrimaryQuery,
  GetRelatedManyCPKSKOneQuery,
  GetRelatedManyCPKSKTwoQuery,
  GetRelatedManyQuery,
  GetRelatedOneCPKSKOneQuery,
  GetRelatedOneCPKSKTwoQuery,
  GetRelatedOneQuery,
  UpdatePrimaryCPKSKOneInput,
  UpdatePrimaryCPKSKTwoInput,
  UpdatePrimaryInput,
} from './API';
import {
  createPrimary,
  createPrimaryCPKSKOne,
  createPrimaryCPKSKTwo,
  createRelatedMany,
  createRelatedManyCPKSKOne,
  createRelatedManyCPKSKTwo,
  createRelatedOne,
  createRelatedOneCPKSKOne,
  createRelatedOneCPKSKTwo,
  updatePrimary,
  updatePrimaryCPKSKOne,
  updatePrimaryCPKSKTwo,
  updateRelatedMany,
  updateRelatedManyCPKSKOne,
  updateRelatedManyCPKSKTwo,
  updateRelatedOneCPKSKOne,
  updateRelatedOneCPKSKTwo,
} from './graphql/mutations';
import {
  getPrimary,
  getPrimaryCPKSKOne,
  getPrimaryCPKSKTwo,
  getRelatedMany,
  getRelatedManyCPKSKOne,
  getRelatedManyCPKSKTwo,
  getRelatedOne,
  getRelatedOneCPKSKOne,
  getRelatedOneCPKSKTwo,
} from './graphql/queries';

// =======================================================================
// Primary as source
// =======================================================================
// #region Primary as source model

export const testPrimaryContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariables(currentId);
  const relatedVariables = getRelatedVariables(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey },
  };

  // Create two RelatedMany records
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedMany, variables: relatedVariables });
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedMany, variables: relatedVariables });

  // Create RelatedMany
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedOne, variables: relatedVariables });

  // Create Primary
  const primaryCreateResult = await doAppSyncGraphqlMutation({ ...args, query: createPrimary, variables: primaryVariables });
  // Assert create mutation response contains associated models
  const primaryCreate = primaryCreateResult.body.data.createPrimary;
  assertPrimaryContainsAssociated(primaryCreate, primaryVariables);

  // Assert get query response contains associated models
  const primaryGetResult = await doAppSyncGraphqlQuery({ ...args, query: getPrimary, variables: primaryVariables });
  const primaryGet = primaryGetResult.body.data.getPrimary;
  assertPrimaryContainsAssociated(primaryGet, primaryVariables);

  // Assert update mutation response contains associated models
  const primaryUpdateResult = await doAppSyncGraphqlMutation({ ...args, query: updatePrimary, variables: primaryVariables });
  const primaryUpdate = primaryUpdateResult.body.data.updatePrimary;
  assertPrimaryContainsAssociated(primaryUpdate, primaryVariables);
};

export const testPrimaryCpkSkOneContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariablesSkOne(currentId);
  const relatedVariables = getRelatedVariablesSkOne(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey },
  };

  // Create two RelatedManyCPKSKOne records
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedManyCPKSKOne, variables: relatedVariables });
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedManyCPKSKOne, variables: relatedVariables });

  // Create RelatedManyCPKSKOne
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedOneCPKSKOne, variables: relatedVariables });

  // Create PrimaryCPKSKOne
  const primaryCreateResult = await doAppSyncGraphqlMutation({ ...args, query: createPrimaryCPKSKOne, variables: primaryVariables });
  // Assert create mutation response contains associated models
  const primaryCreate = primaryCreateResult.body.data.createPrimaryCPKSKOne;
  assertPrimaryCpkOneContainsAssociated(primaryCreate, primaryVariables);

  // Assert get query response contains associated models
  const primaryGetResult = await doAppSyncGraphqlQuery({ ...args, query: getPrimaryCPKSKOne, variables: primaryVariables });
  const primaryGet = primaryGetResult.body.data.getPrimaryCPKSKOne;
  assertPrimaryCpkOneContainsAssociated(primaryGet, primaryVariables);

  // Assert update mutation response contains associated models
  const primaryUpdateResult = await doAppSyncGraphqlMutation({ ...args, query: updatePrimaryCPKSKOne, variables: primaryVariables });
  const primaryUpdate = primaryUpdateResult.body.data.updatePrimaryCPKSKOne;
  assertPrimaryCpkOneContainsAssociated(primaryUpdate, primaryVariables);
};

export const testPrimaryCpkSkTwoContainAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariablesSkTwo(currentId);
  const relatedVariables = getRelatedVariablesSkTwo(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  // Create two RelatedManyCPKSKOne records
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedManyCPKSKTwo, variables: relatedVariables });
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedManyCPKSKTwo, variables: relatedVariables });

  // Create RelatedManyCPKSKOne
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedOneCPKSKTwo, variables: relatedVariables });

  // Create PrimaryCPKSKOne
  const primaryCreateResult = await doAppSyncGraphqlMutation({ ...args, query: createPrimaryCPKSKTwo, variables: primaryVariables });
  // Assert create mutation response contains associated models
  const primaryCreate = primaryCreateResult.body.data.createPrimaryCPKSKTwo;
  assertPrimaryCpkTwoContainsAssociated(primaryCreate, primaryVariables);

  // Assert get query response contains associated models
  const primaryGetResult = await doAppSyncGraphqlQuery({ ...args, query: getPrimaryCPKSKTwo, variables: primaryVariables });
  const primaryGet = primaryGetResult.body.data.getPrimaryCPKSKTwo;
  assertPrimaryCpkTwoContainsAssociated(primaryGet, primaryVariables);

  // Assert update mutation response contains associated models
  const primaryUpdateResult = await doAppSyncGraphqlMutation({ ...args, query: updatePrimaryCPKSKTwo, variables: primaryVariables });
  const primaryUpdate = primaryUpdateResult.body.data.updatePrimaryCPKSKTwo;
  assertPrimaryCpkTwoContainsAssociated(primaryUpdate, primaryVariables);
};

export const testPrimaryMultipleHasOneContainsOneHasOne = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariablesSkOne(currentId);
  const relatedVariables = getRelatedVariablesSkOne(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey },
  };
  // Create two `RelatedOne`s
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedOneCPKSKOne, variables: relatedVariables });
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedOneCPKSKOne, variables: relatedVariables });

  // Create PrimaryCPKSKOne
  const primaryCreateResult = await doAppSyncGraphqlMutation({ ...args, query: createPrimaryCPKSKOne, variables: primaryVariables });
  // Assert create mutation response contains one RelatedOne model
  const primaryCreate = primaryCreateResult.body.data.createPrimaryCPKSKOne;
  expect(primaryCreate.relatedOne).toBeDefined();
  expect(primaryCreate.relatedOne.primaryId).toEqual(primaryVariables.id);
  expect(primaryCreate.relatedOne.primarySkOne).toEqual(primaryVariables.skOne);

  // Assert get query response contains one RelatedOne model
  const primaryGetResult = await doAppSyncGraphqlQuery({ ...args, query: getPrimaryCPKSKOne, variables: primaryVariables });
  const primaryGet = primaryGetResult.body.data.getPrimaryCPKSKOne;
  expect(primaryGet.relatedOne).toBeDefined();
  expect(primaryGet.relatedOne.primaryId).toEqual(primaryVariables.id);
  expect(primaryGet.relatedOne.primarySkOne).toEqual(primaryVariables.skOne);

  // Assert update mutation response contains one RelatedOne model
  const primaryUpdateResult = await doAppSyncGraphqlMutation({ ...args, query: updatePrimaryCPKSKOne, variables: primaryVariables });
  const primaryUpdate = primaryUpdateResult.body.data.updatePrimaryCPKSKOne;
  expect(primaryUpdate.relatedOne).toBeDefined();
  expect(primaryUpdate.relatedOne.primaryId).toEqual(primaryVariables.id);
  expect(primaryUpdate.relatedOne.primarySkOne).toEqual(primaryVariables.skOne);
};

// #region Primary assertions
const assertPrimaryContainsAssociated = (
  primary: RecursiveOmit<GetPrimaryQuery['getPrimary'], '__typename'>,
  expected: CreatePrimaryInput,
): void => {
  expect(primary).toBeDefined();
  expect(primary.id).toEqual(expected.id);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.primaryId).toEqual(expected.id);
};

const assertPrimaryCpkOneContainsAssociated = (
  primary: RecursiveOmit<GetPrimaryCPKSKOneQuery['getPrimaryCPKSKOne'], '__typename'>,
  expected: CreatePrimaryCPKSKOneInput,
): void => {
  assertPrimaryContainsAssociated(primary, expected);
  expect(primary.skOne).toEqual(expected.skOne);
  expect(primary.relatedOne.primarySkOne).toEqual(expected.skOne);
};

const assertPrimaryCpkTwoContainsAssociated = (
  primary: RecursiveOmit<GetPrimaryCPKSKTwoQuery['getPrimaryCPKSKTwo'], '__typename'>,
  expected: CreatePrimaryCPKSKTwoInput,
): void => {
  assertPrimaryCpkOneContainsAssociated(primary, expected);
  expect(primary.skTwo).toEqual(expected.skTwo);
  expect(primary.relatedOne.primarySkTwo).toEqual(expected.skTwo);
};

// #endregion Primary assertions
// #endregion Primary as source model

// =======================================================================
// RelatedOne as source
// =======================================================================
// #region RelatedOne as source model

export const testRelatedOneContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariables(currentId);
  const relatedVariables = getRelatedVariables(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  // Create PrimaryCPKSKOne
  await doAppSyncGraphqlMutation({ ...args, query: createPrimary, variables: primaryVariables });

  // Create two RelatedManyCPKSKOne records
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedMany, variables: relatedVariables });
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedMany, variables: relatedVariables });

  // Create RelatedOneCPKSKOne
  const relatedOneCreateResult = await doAppSyncGraphqlMutation({ ...args, query: createRelatedOne, variables: relatedVariables });
  // Assert create mutation response contains associated models
  const relatedOneCreate = relatedOneCreateResult.body.data.createRelatedOne;
  assertRelatedOneContainsAssociated(relatedOneCreate, primaryVariables);

  // Assert get query response contains associated models
  const relatedOneGetResult = await doAppSyncGraphqlQuery({
    ...args,
    query: getRelatedOne,
    variables: { id: relatedOneCreate.id, ...relatedVariables },
  });
  const relatedOneGet = relatedOneGetResult.body.data.getRelatedOne;
  assertRelatedOneContainsAssociated(relatedOneGet, primaryVariables);

  // Assert update mutation response contains associated models
  const relatedOneUpdatedResult = await doAppSyncGraphqlMutation({
    ...args,
    query: updateRelatedOneCPKSKOne,
    variables: { id: relatedOneCreate.id, ...relatedVariables },
  });
  const relatedOneUpdate = relatedOneUpdatedResult.body.data.updateRelatedOneCPKSKOne;
  assertRelatedOneContainsAssociated(relatedOneUpdate, primaryVariables);
};

export const testRelatedOneCpkSkOneContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariablesSkOne(currentId);
  const relatedVariables = getRelatedVariablesSkOne(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  // Create PrimaryCPKSKOne
  await doAppSyncGraphqlMutation({ ...args, query: createPrimaryCPKSKOne, variables: primaryVariables });

  // Create two RelatedManyCPKSKOne records
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedManyCPKSKOne, variables: relatedVariables });
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedManyCPKSKOne, variables: relatedVariables });

  // Create RelatedOneCPKSKOne
  const relatedOneCreateResult = await doAppSyncGraphqlMutation({ ...args, query: createRelatedOneCPKSKOne, variables: relatedVariables });
  // Assert create mutation response contains associated models
  const relatedOneCreate = relatedOneCreateResult.body.data.createRelatedOneCPKSKOne;
  assertRelatedOneCpkOneContainsAssociated(relatedOneCreate, primaryVariables);

  // Assert get query response contains associated models
  const relatedOneGetResult = await doAppSyncGraphqlQuery({
    ...args,
    query: getRelatedOneCPKSKOne,
    variables: { id: relatedOneCreate.id, ...relatedVariables },
  });
  const relatedOneGet = relatedOneGetResult.body.data.getRelatedOneCPKSKOne;
  assertRelatedOneCpkOneContainsAssociated(relatedOneGet, primaryVariables);

  // Assert update mutation response contains associated models
  const relatedOneUpdatedResult = await doAppSyncGraphqlMutation({
    ...args,
    query: updateRelatedOneCPKSKOne,
    variables: { id: relatedOneCreate.id, ...relatedVariables },
  });
  const relatedOneUpdate = relatedOneUpdatedResult.body.data.updateRelatedOneCPKSKOne;
  assertRelatedOneCpkOneContainsAssociated(relatedOneUpdate, primaryVariables);
};

export const testRelatedOneCpkSkTwoContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariablesSkTwo(currentId);
  const relatedVariables = getRelatedVariablesSkTwo(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  // Create PrimaryCPKSKOne
  await doAppSyncGraphqlMutation({ ...args, query: createPrimaryCPKSKTwo, variables: primaryVariables });

  // Create two RelatedManyCPKSKOne records
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedManyCPKSKTwo, variables: relatedVariables });
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedManyCPKSKTwo, variables: relatedVariables });

  // Create RelatedOneCPKSKOne
  const relatedOneCreateResult = await doAppSyncGraphqlMutation({ ...args, query: createRelatedOneCPKSKTwo, variables: relatedVariables });
  // Assert create mutation response contains associated models
  const relatedOneCreate = relatedOneCreateResult.body.data.createRelatedOneCPKSKTwo;
  assertRelatedOneCpkTwoContainsAssociated(relatedOneCreate, primaryVariables);

  // Assert get query response contains associated models
  const relatedOneGetResult = await doAppSyncGraphqlQuery({
    ...args,
    query: getRelatedOneCPKSKTwo,
    variables: { id: relatedOneCreate.id, ...relatedVariables },
  });
  const relatedOneGet = relatedOneGetResult.body.data.getRelatedOneCPKSKTwo;
  assertRelatedOneCpkTwoContainsAssociated(relatedOneGet, primaryVariables);

  // Assert update mutation response contains associated models
  const relatedOneUpdatedResult = await doAppSyncGraphqlMutation({
    ...args,
    query: updateRelatedOneCPKSKTwo,
    variables: { id: relatedOneCreate.id, ...relatedVariables },
  });
  const relatedOneUpdate = relatedOneUpdatedResult.body.data.updateRelatedOneCPKSKTwo;
  assertRelatedOneCpkTwoContainsAssociated(relatedOneUpdate, primaryVariables);
};

// #region RelatedOne assertions
const assertRelatedOneContainsAssociated = (
  relatedOne: RecursiveOmit<GetRelatedOneQuery['getRelatedOne'], '__typename'>,
  expected: CreatePrimaryInput,
): void => {
  expect(relatedOne).toBeDefined();
  expect(relatedOne.primary.id).toEqual(expected.id);
  expect(relatedOne).toBeDefined();
  expect(relatedOne.primaryId).toEqual(expected.id);
};

const assertRelatedOneCpkOneContainsAssociated = (
  relatedOne: RecursiveOmit<GetRelatedOneCPKSKOneQuery['getRelatedOneCPKSKOne'], '__typename'>,
  expected: CreatePrimaryCPKSKOneInput,
): void => {
  assertRelatedOneContainsAssociated(relatedOne, expected);
  expect(relatedOne.primary.skOne).toEqual(expected.skOne);
  expect(relatedOne.primarySkOne).toEqual(expected.skOne);
};

const assertRelatedOneCpkTwoContainsAssociated = (
  relatedOne: RecursiveOmit<GetRelatedOneCPKSKTwoQuery['getRelatedOneCPKSKTwo'], '__typename'>,
  expected: CreatePrimaryCPKSKTwoInput,
): void => {
  assertRelatedOneCpkOneContainsAssociated(relatedOne, expected);
  expect(relatedOne.primarySkTwo).toEqual(expected.skTwo);
  expect(relatedOne.primary.skTwo).toEqual(expected.skTwo);
};
// #endregion RelatedOne assertions
// #endregion RelatedOne as source model

// =======================================================================
// RelatedMany as source
// =======================================================================
// #region RelatedMany as source model

export const testRelatedManyContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariables(currentId);
  const relatedVariables = getRelatedVariables(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  // Create PrimaryCPKSKOne
  await doAppSyncGraphqlMutation({ ...args, query: createPrimary, variables: primaryVariables });

  // Create RelatedOneCPKSKOne
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedOne, variables: relatedVariables });

  // Create two RelatedManyCPKSKOne records
  const relatedManyCreateResultA = await doAppSyncGraphqlMutation({
    ...args,
    query: createRelatedMany,
    variables: relatedVariables,
  });
  const relatedManyCreateResultB = await doAppSyncGraphqlMutation({
    ...args,
    query: createRelatedMany,
    variables: relatedVariables,
  });
  // Assert create mutation responses contains associated models
  const relatedManyCreateA = relatedManyCreateResultA.body.data.createRelatedMany;
  assertRelatedManyContainsAssociated(relatedManyCreateA, primaryVariables);

  const relatedManyCreateB = relatedManyCreateResultB.body.data.createRelatedMany;
  assertRelatedManyContainsAssociated(relatedManyCreateB, primaryVariables);

  // Assert get query responses contains associated models
  const relatedManyGetResultA = await doAppSyncGraphqlQuery({
    ...args,
    query: getRelatedMany,
    variables: { id: relatedManyCreateA.id },
  });
  const relatedManyGetA = relatedManyGetResultA.body.data.getRelatedMany;
  assertRelatedManyContainsAssociated(relatedManyGetA, primaryVariables);

  const relatedManyGetResultB = await doAppSyncGraphqlQuery({
    ...args,
    query: getRelatedMany,
    variables: { id: relatedManyCreateA.id },
  });
  const relatedManyGetB = relatedManyGetResultB.body.data.getRelatedMany;
  assertRelatedManyContainsAssociated(relatedManyGetB, primaryVariables);

  // Assert update mutation response contains associated models
  const relatedManyUpdatedResultA = await doAppSyncGraphqlMutation({
    ...args,
    query: updateRelatedMany,
    variables: { id: relatedManyCreateA.id, ...relatedVariables },
  });
  const relatedManyUpdateA = relatedManyUpdatedResultA.body.data.updateRelatedMany;
  assertRelatedManyContainsAssociated(relatedManyUpdateA, primaryVariables);

  const relatedManyUpdatedResultB = await doAppSyncGraphqlMutation({
    ...args,
    query: updateRelatedMany,
    variables: { id: relatedManyCreateA.id, ...relatedVariables },
  });
  const relatedManyUpdateB = relatedManyUpdatedResultB.body.data.updateRelatedMany;
  assertRelatedManyContainsAssociated(relatedManyUpdateB, primaryVariables);
};

export const testRelatedManyCpkSkOneContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariablesSkOne(currentId);
  const relatedVariables = getRelatedVariablesSkOne(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  // Create PrimaryCPKSKOne
  await doAppSyncGraphqlMutation({ ...args, query: createPrimaryCPKSKOne, variables: primaryVariables });

  // Create RelatedOneCPKSKOne
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedOneCPKSKOne, variables: relatedVariables });

  // Create two RelatedManyCPKSKOne records
  const relatedManyCreateResultA = await doAppSyncGraphqlMutation({
    ...args,
    query: createRelatedManyCPKSKOne,
    variables: relatedVariables,
  });
  const relatedManyCreateResultB = await doAppSyncGraphqlMutation({
    ...args,
    query: createRelatedManyCPKSKOne,
    variables: relatedVariables,
  });
  // Assert create mutation responses contains associated models
  const relatedManyCreateA = relatedManyCreateResultA.body.data.createRelatedManyCPKSKOne;
  assertRelatedManyCpkOneContainsAssociated(relatedManyCreateA, primaryVariables);

  const relatedManyCreateB = relatedManyCreateResultB.body.data.createRelatedManyCPKSKOne;
  assertRelatedManyCpkOneContainsAssociated(relatedManyCreateB, primaryVariables);

  // Assert get query responses contains associated models
  const relatedManyGetResultA = await doAppSyncGraphqlQuery({
    ...args,
    query: getRelatedManyCPKSKOne,
    variables: { id: relatedManyCreateA.id },
  });
  const relatedManyGetA = relatedManyGetResultA.body.data.getRelatedManyCPKSKOne;
  assertRelatedManyCpkOneContainsAssociated(relatedManyGetA, primaryVariables);

  const relatedManyGetResultB = await doAppSyncGraphqlQuery({
    ...args,
    query: getRelatedManyCPKSKOne,
    variables: { id: relatedManyCreateA.id },
  });
  const relatedManyGetB = relatedManyGetResultB.body.data.getRelatedManyCPKSKOne;
  assertRelatedManyCpkOneContainsAssociated(relatedManyGetB, primaryVariables);

  // Assert update mutation response contains associated models
  const relatedManyUpdatedResultA = await doAppSyncGraphqlMutation({
    ...args,
    query: updateRelatedManyCPKSKOne,
    variables: { id: relatedManyCreateA.id, ...relatedVariables },
  });
  const relatedManyUpdateA = relatedManyUpdatedResultA.body.data.updateRelatedManyCPKSKOne;
  assertRelatedManyCpkOneContainsAssociated(relatedManyUpdateA, primaryVariables);

  const relatedManyUpdatedResultB = await doAppSyncGraphqlMutation({
    ...args,
    query: updateRelatedManyCPKSKOne,
    variables: { id: relatedManyCreateA.id, ...relatedVariables },
  });
  const relatedManyUpdateB = relatedManyUpdatedResultB.body.data.updateRelatedManyCPKSKOne;
  assertRelatedManyCpkOneContainsAssociated(relatedManyUpdateB, primaryVariables);
};

export const testRelatedManypkSkTwoContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariablesSkTwo(currentId);
  const relatedVariables = getRelatedVariablesSkTwo(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  // Create PrimaryCPKSKTwo
  await doAppSyncGraphqlMutation({ ...args, query: createPrimaryCPKSKTwo, variables: primaryVariables });

  // Create RelatedOneCPKSKTwo
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedOneCPKSKTwo, variables: relatedVariables });

  // Create two RelatedManyCPKSKTwo records
  const relatedManyCreateResultA = await doAppSyncGraphqlMutation({
    ...args,
    query: createRelatedManyCPKSKTwo,
    variables: relatedVariables,
  });

  const relatedManyCreateResultB = await doAppSyncGraphqlMutation({
    ...args,
    query: createRelatedManyCPKSKTwo,
    variables: relatedVariables,
  });

  // Assert create mutation responses contains associated models
  const relatedManyCreateA = relatedManyCreateResultA.body.data.createRelatedManyCPKSKTwo;
  assertRelatedManyCpkTwoContainsAssociated(relatedManyCreateA, primaryVariables);

  const relatedManyCreateB = relatedManyCreateResultB.body.data.createRelatedManyCPKSKTwo;
  assertRelatedManyCpkTwoContainsAssociated(relatedManyCreateB, primaryVariables);

  // Assert get query responses contains associated models
  const relatedManyGetResultA = await doAppSyncGraphqlQuery({
    ...args,
    query: getRelatedManyCPKSKTwo,
    variables: { id: relatedManyCreateA.id },
  });
  const relatedManyGetA = relatedManyGetResultA.body.data.getRelatedManyCPKSKTwo;
  assertRelatedManyCpkTwoContainsAssociated(relatedManyGetA, primaryVariables);

  const relatedManyGetResultB = await doAppSyncGraphqlQuery({
    ...args,
    query: getRelatedManyCPKSKTwo,
    variables: { id: relatedManyCreateA.id },
  });
  const relatedManyGetB = relatedManyGetResultB.body.data.getRelatedManyCPKSKTwo;
  assertRelatedManyCpkTwoContainsAssociated(relatedManyGetB, primaryVariables);

  // Assert update mutation response contains associated models
  const relatedManyUpdatedResultA = await doAppSyncGraphqlMutation({
    ...args,
    query: updateRelatedManyCPKSKTwo,
    variables: { id: relatedManyCreateA.id, ...relatedVariables },
  });
  const relatedManyUpdateA = relatedManyUpdatedResultA.body.data.updateRelatedManyCPKSKTwo;
  assertRelatedManyCpkTwoContainsAssociated(relatedManyUpdateA, primaryVariables);

  const relatedManyUpdatedResultB = await doAppSyncGraphqlMutation({
    ...args,
    query: updateRelatedManyCPKSKTwo,
    variables: { id: relatedManyCreateA.id, ...relatedVariables },
  });
  const relatedManyUpdateB = relatedManyUpdatedResultB.body.data.updateRelatedManyCPKSKTwo;
  assertRelatedManyCpkTwoContainsAssociated(relatedManyUpdateB, primaryVariables);
};

// #region RelatedMany assertions
const assertRelatedManyContainsAssociated = (
  relatedMany: RecursiveOmit<GetRelatedManyQuery['getRelatedMany'], '__typename'>,
  expected: CreatePrimaryInput,
): void => {
  expect(relatedMany).toBeDefined();
  expect(relatedMany.primaryId).toEqual(expected.id);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(expected.id);
};

const assertRelatedManyCpkOneContainsAssociated = (
  relatedMany: RecursiveOmit<GetRelatedManyCPKSKOneQuery['getRelatedManyCPKSKOne'], '__typename'>,
  expected: CreatePrimaryCPKSKOneInput,
): void => {
  assertRelatedManyContainsAssociated(relatedMany, expected);
  expect(relatedMany.primarySkOne).toEqual(expected.skOne);
  expect(relatedMany.primary.skOne).toEqual(expected.skOne);
};

const assertRelatedManyCpkTwoContainsAssociated = (
  relatedMany: RecursiveOmit<GetRelatedManyCPKSKTwoQuery['getRelatedManyCPKSKTwo'], '__typename'>,
  expected: CreatePrimaryCPKSKTwoInput,
): void => {
  assertRelatedManyCpkOneContainsAssociated(relatedMany, expected);
  expect(relatedMany.primarySkTwo).toEqual(expected.skTwo);
  expect(relatedMany.primary.skTwo).toEqual(expected.skTwo);
};
// #endregion RelatedMany assertions
// #endregion RelatedMany as source model

// =======================================================================
// Helpers
// =======================================================================
// #region Helpers

type RecursiveOmit<T, K extends PropertyKey> = {
  [P in keyof T as P extends K ? never : P]: RecursiveOmit<T[P], K extends `${infer R}` ? R : never>;
};

const getPrimaryVariables = (currentId: number): UpdatePrimaryInput => {
  return {
    id: `p${currentId}`,
  };
};

const getPrimaryVariablesSkOne = (currentId: number): UpdatePrimaryCPKSKOneInput => {
  return {
    ...getPrimaryVariables(currentId),
    skOne: `pskone${currentId}`,
  };
};

const getPrimaryVariablesSkTwo = (currentId: number): UpdatePrimaryCPKSKTwoInput => {
  return {
    ...getPrimaryVariablesSkOne(currentId),
    skTwo: `psktwo${currentId}`,
  };
};

const getRelatedVariables = (primaryVariables: UpdatePrimaryInput): CreateRelatedOneInput => {
  return {
    primaryId: primaryVariables.id,
  };
};

const getRelatedVariablesSkOne = (primaryVariables: UpdatePrimaryCPKSKOneInput): CreateRelatedOneCPKSKOneInput => {
  return {
    primaryId: primaryVariables.id,
    primarySkOne: primaryVariables.skOne,
  };
};

const getRelatedVariablesSkTwo = (primaryVariables: UpdatePrimaryCPKSKTwoInput): CreateRelatedOneCPKSKTwoInput => {
  return {
    primaryId: primaryVariables.id,
    primarySkOne: primaryVariables.skOne,
    primarySkTwo: primaryVariables.skTwo,
  };
};

// #endregion Helpers
