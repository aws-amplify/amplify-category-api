import { doAppSyncGraphqlMutation, doAppSyncGraphqlQuery } from '../../../utils';
import {
  GetPrimaryCPKSKOneQuery,
  GetPrimaryCPKSKTwoQuery,
  GetRelatedManyCPKSKOneQuery,
  GetRelatedManyCPKSKTwoQuery,
  GetRelatedOneCPKSKOneQuery,
  GetRelatedOneCPKSKTwoQuery,
} from './API';
import {
  createPrimaryCPKSKOne,
  createPrimaryCPKSKTwo,
  createRelatedManyCPKSKOne,
  createRelatedManyCPKSKTwo,
  createRelatedOneCPKSKOne,
  createRelatedOneCPKSKTwo,
  updatePrimaryCPKSKOne,
  updatePrimaryCPKSKTwo,
  updateRelatedManyCPKSKOne,
  updateRelatedManyCPKSKTwo,
  updateRelatedOneCPKSKOne,
  updateRelatedOneCPKSKTwo,
} from './graphql/mutations';
import {
  getPrimaryCPKSKOne,
  getPrimaryCPKSKTwo,
  getRelatedManyCPKSKOne,
  getRelatedManyCPKSKTwo,
  getRelatedOneCPKSKOne,
  getRelatedOneCPKSKTwo,
} from './graphql/queries';

// =======================================================================
// Primary as source
// =======================================================================
// #region Primary as source model

export const testPrimaryCpkSkOneContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariables(currentId);
  const relatedVariables = getRelatedVariables(primaryVariables);
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
  const primaryVariables = getPrimaryVariables(currentId);
  const relatedVariables = getRelatedVariables(primaryVariables);
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  // Create two RelatedManyCPKSKOne records
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedManyCPKSKTwo, variables: relatedVariables });
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedManyCPKSKTwo, variables: relatedVariables });

  // Create RelatedManyCPKSKOne
  await doAppSyncGraphqlMutation({ ...args, query: createRelatedOneCPKSKOne, variables: relatedVariables });

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

// #region Primary assertions
const assertPrimaryCpkOneContainsAssociated = (
  primary: RecursiveOmit<GetPrimaryCPKSKOneQuery['getPrimaryCPKSKOne'], '__typename'>,
  expected: Omit<PrimaryVariables, 'skTwo'>,
): void => {
  expect(primary).toBeDefined();
  expect(primary.id).toEqual(expected.id);
  expect(primary.skOne).toEqual(expected.skOne);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.primaryId).toEqual(expected.id);
  expect(primary.relatedOne.primarySkOne).toEqual(expected.skOne);
};

const assertPrimaryCpkTwoContainsAssociated = (
  primary: RecursiveOmit<GetPrimaryCPKSKTwoQuery['getPrimaryCPKSKTwo'], '__typename'>,
  expected: PrimaryVariables,
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

export const testRelatedOneCpkSkOneContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariables(currentId);
  const relatedVariables = getRelatedVariables(primaryVariables);
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
  const primaryVariables = getPrimaryVariables(currentId);
  const relatedVariables = getRelatedVariables(primaryVariables);
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
const assertRelatedOneCpkOneContainsAssociated = (
  relatedOne: RecursiveOmit<GetRelatedOneCPKSKOneQuery['getRelatedOneCPKSKOne'], '__typename'>,
  expected: Omit<PrimaryVariables, 'skTwo'>,
): void => {
  expect(relatedOne).toBeDefined();
  expect(relatedOne.primary.id).toEqual(expected.id);
  expect(relatedOne.primary.skOne).toEqual(expected.skOne);
  expect(relatedOne).toBeDefined();
  expect(relatedOne.primaryId).toEqual(expected.id);
  expect(relatedOne.primarySkOne).toEqual(expected.skOne);
  // expect(relatedOne.primary.relatedMany.items.length).toEqual(2);
  // expect(relatedOne.primary.relatedMany.items[0].primaryId).toEqual(expected.id);
  // expect(relatedOne.primary.relatedMany.items[0].skOne).toEqual(expected.skOne);
  // expect(relatedOne.primary.relatedMany.items[1].primaryId).toEqual(expected.id);
  // expect(relatedOne.primary.relatedMany.items[1].skOne).toEqual(expected.skOne);
};

const assertRelatedOneCpkTwoContainsAssociated = (
  relatedOne: RecursiveOmit<GetRelatedOneCPKSKTwoQuery['getRelatedOneCPKSKTwo'], '__typename'>,
  expected: PrimaryVariables,
): void => {
  assertRelatedOneCpkOneContainsAssociated(relatedOne, expected);
  expect(relatedOne.primarySkTwo).toEqual(expected.skTwo);
  expect(relatedOne.primary.skOne).toEqual(expected.skTwo);
  // expect(relatedOne.primary.relatedMany.items[0].skTwo).toEqual(expected.skTwo);
  // expect(relatedOne.primary.relatedMany.items[1].skTwo).toEqual(expected.skTwo);
};
// #endregion RelatedOne assertions
// #endregion RelatedOne as source model

// =======================================================================
// RelatedMany as source
// =======================================================================
// #region RelatedMany as source model
export const testRelatedManyCpkSkOneContainsAssociated = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primaryVariables = getPrimaryVariables(currentId);
  const relatedVariables = getRelatedVariables(primaryVariables);
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
  const primaryVariables = getPrimaryVariables(currentId);
  const relatedVariables = getRelatedVariables(primaryVariables);
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
const assertRelatedManyCpkOneContainsAssociated = (
  relatedMany: RecursiveOmit<GetRelatedManyCPKSKOneQuery['getRelatedManyCPKSKOne'], '__typename'>,
  expected: Omit<PrimaryVariables, 'skTwo'>,
): void => {
  expect(relatedMany).toBeDefined();
  expect(relatedMany.primaryId).toEqual(expected.id);
  expect(relatedMany.primarySkOne).toEqual(expected.skOne);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(expected.id);
  expect(relatedMany.primary.skOne).toEqual(expected.skOne);
  // expect(relatedMany.primary.relatedOne).toBeDefined();
  // expect(relatedMany.primary.relatedOne.primaryId).toEqual(expected.id);
  // expect(relatedMany.primary.relatedOne.skOne).toEqual(expected.skOne);
};

const assertRelatedManyCpkTwoContainsAssociated = (
  relatedMany: RecursiveOmit<GetRelatedManyCPKSKTwoQuery['getRelatedManyCPKSKTwo'], '__typename'>,
  expected: PrimaryVariables,
): void => {
  assertRelatedManyCpkOneContainsAssociated(relatedMany, expected);
  expect(relatedMany.primarySkTwo).toEqual(expected.skTwo);
  expect(relatedMany.primary.skOne).toEqual(expected.skTwo);
  //   expect(relatedMany.primary.relatedOne.skTwo).toEqual(expected.skTwo);
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

type PrimaryVariables = {
  id: string;
  skOne: string;
  skTwo: string;
};

type RelatedVariables = {
  primaryId: string;
  primarySkOne: string;
  primarySkTwo: string;
};

const getPrimaryVariables = (currentId: number): PrimaryVariables => {
  return {
    id: `p${currentId}`,
    skOne: `pskone${currentId}`,
    skTwo: `psktwo${currentId}`,
  };
};

const getRelatedVariables = (primaryVariables: PrimaryVariables): RelatedVariables => {
  return {
    primaryId: primaryVariables.id,
    primarySkOne: primaryVariables.skOne,
    primarySkTwo: primaryVariables.skTwo,
  };
};

// #endregion Helpers
