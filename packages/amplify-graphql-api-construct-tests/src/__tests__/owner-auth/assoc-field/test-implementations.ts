import {
  doCreateRelatedOne,
  doCreateRelatedMany,
  doCreatePrimary,
  doUpdatePrimary,
  doGetPrimary,
  doListPrimaries,
  doUpdateRelatedOne,
  doGetRelatedOne,
  doListRelatedOnes,
  doUpdateRelatedMany,
  doGetRelatedMany,
  doListRelatedManies,
} from '../../graphql-schemas/reference-style-owner-auth/operation-implementations';

// #region Primary as source

export const testCreatePrimaryVisibleForSameOwner = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);

  const result = await doCreatePrimary(apiEndpoint, accessToken, primaryId);
  const primary = result.body.data.createPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testCreatePrimaryRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken2, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken2, relatedManyId, primaryId);

  const result = await doCreatePrimary(apiEndpoint, accessToken1, primaryId);
  const primary = result.body.data.createPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(0);
};

export const testUpdatePrimaryVisibleForSameOwner = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);
  await doCreatePrimary(apiEndpoint, accessToken, primaryId);

  const result = await doUpdatePrimary(apiEndpoint, accessToken, primaryId);
  const primary = result.body.data.updatePrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testUpdatePrimaryRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken2, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken2, relatedManyId, primaryId);
  await doCreatePrimary(apiEndpoint, accessToken1, primaryId);

  const result = await doUpdatePrimary(apiEndpoint, accessToken1, primaryId);
  const primary = result.body.data.updatePrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(0);
};

export const testGetPrimaryVisibleForSameOwner = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);
  await doCreatePrimary(apiEndpoint, accessToken, primaryId);

  const result = await doGetPrimary(apiEndpoint, accessToken, primaryId);
  const primary = result.body.data.getPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);
  expect(primary.relatedOne.primary.id).toEqual(primaryId);
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testGetPrimaryRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken2, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken2, relatedManyId, primaryId);
  await doCreatePrimary(apiEndpoint, accessToken1, primaryId);

  const result = await doGetPrimary(apiEndpoint, accessToken1, primaryId);
  const primary = result.body.data.getPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(0);
};

export const testGetPrimaryUnauthorizedForDifferentOwner = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken2, primaryId);

  const result = await doGetPrimary(apiEndpoint, accessToken1, primaryId);
  const primary = result.body.data.getPrimary;

  expect(primary).toBeNull();
};

export const testListPrimariesVisibleForSameOwner = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);
  await doCreatePrimary(apiEndpoint, accessToken, primaryId);

  const result = await doListPrimaries(apiEndpoint, accessToken, primaryId);
  expect(result.body.data.listPrimaries.items.length).toEqual(1);
  const primary = result.body.data.listPrimaries.items[0];

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);
  expect(primary.relatedOne.primary.id).toEqual(primaryId);
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testListPrimariesRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken2, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken2, relatedManyId, primaryId);
  await doCreatePrimary(apiEndpoint, accessToken1, primaryId);

  const result = await doListPrimaries(apiEndpoint, accessToken1, primaryId);
  expect(result.body.data.listPrimaries.items.length).toEqual(1);
  const primary = result.body.data.listPrimaries.items[0];

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(0);
};

export const testListPrimariesRedactsTopLevelItemsForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken2, primaryId);

  const result = await doListPrimaries(apiEndpoint, accessToken1, primaryId);
  expect(result.body.data.listPrimaries.items.length).toEqual(0);
};

// #endregion

// #region RelatedOne as source

export const testCreateRelatedOneVisibleForSameOwner = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);

  const result = await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);
  const relatedOne = result.body.data?.createRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);
  expect(relatedOne.primary.relatedMany.items.length).toEqual(1);
  expect(relatedOne.primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testCreateRelatedOneRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken2, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken2, relatedManyId, primaryId);

  const result = await doCreateRelatedOne(apiEndpoint, accessToken1, relatedOneId, primaryId);
  const relatedOne = result.body.data?.createRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

export const testUpdateRelatedOneVisibleForSameOwner = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);

  const result = await doUpdateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);
  const relatedOne = result.body.data?.updateRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);
  expect(relatedOne.primary.relatedMany.items.length).toEqual(1);
  expect(relatedOne.primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testUpdateRelatedOneRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken2, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken2, relatedManyId, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken1, relatedOneId, primaryId);

  const result = await doUpdateRelatedOne(apiEndpoint, accessToken1, relatedOneId, primaryId);
  const relatedOne = result.body.data?.updateRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

export const testGetRelatedOneVisibleForSameOwner = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);

  const result = await doGetRelatedOne(apiEndpoint, accessToken, relatedOneId);
  const relatedOne = result.body.data?.getRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);
  expect(relatedOne.primary.relatedMany.items.length).toEqual(1);
  expect(relatedOne.primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testGetRelatedOneRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken2, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken2, relatedManyId, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken1, relatedOneId, primaryId);

  const result = await doGetRelatedOne(apiEndpoint, accessToken1, relatedOneId);
  const relatedOne = result.body.data?.getRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

export const testListRelatedOnesVisibleForSameOwner = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);

  const result = await doListRelatedOnes(apiEndpoint, accessToken, relatedOneId);
  const relatedOne = result.body.data?.listRelatedOnes.items[0];

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);
  // Schemas are generated with max-depth of 4, so `listRelatedOnes.items[0].relatedOne.primary.items` is not present in this selection set.
};

export const testListRelatedOnesRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken2, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken2, relatedManyId, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken1, relatedOneId, primaryId);

  const result = await doListRelatedOnes(apiEndpoint, accessToken1, relatedOneId);
  const relatedOne = result.body.data?.listRelatedOnes.items[0];

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

// #endregion

// #region RelatedMany as source

export const testCreateRelatedManyVisibleForSameOwner = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);

  const result = await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);
  const relatedMany = result.body.data?.createRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);
  expect(relatedMany.primary.relatedOne).toBeDefined();
  expect(relatedMany.primary.relatedOne.id).toEqual(relatedOneId);
};

export const testCreateRelatedManyRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken2, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken2, relatedOneId, primaryId);

  const result = await doCreateRelatedMany(apiEndpoint, accessToken1, relatedManyId, primaryId);
  const relatedMany = result.body.data?.createRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

export const testUpdateRelatedManyVisibleForSameOwner = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);

  const result = await doUpdateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);
  const relatedMany = result.body.data?.updateRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);
  expect(relatedMany.primary.relatedOne).toBeDefined();
  expect(relatedMany.primary.relatedOne.id).toEqual(relatedOneId);
};

export const testUpdateRelatedManyRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken2, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken2, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken1, relatedManyId, primaryId);

  const result = await doUpdateRelatedMany(apiEndpoint, accessToken1, relatedManyId, primaryId);
  const relatedMany = result.body.data?.updateRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

export const testGetRelatedManyVisibleForSameOwner = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);

  const result = await doGetRelatedMany(apiEndpoint, accessToken, relatedManyId);
  const relatedMany = result.body.data?.getRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);
  expect(relatedMany.primary.relatedOne).toBeDefined();
  expect(relatedMany.primary.relatedOne.id).toEqual(relatedOneId);
};

export const testGetRelatedManyRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken2, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken2, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken1, relatedManyId, primaryId);

  const result = await doGetRelatedMany(apiEndpoint, accessToken1, relatedManyId);
  const relatedMany = result.body.data?.getRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

export const testListRelatedManiesVisibleForSameOwner = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);

  const result = await doListRelatedManies(apiEndpoint, accessToken, relatedManyId);
  const relatedMany = result.body.data?.listRelatedManies.items[0];

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);
  expect(relatedMany.primary.relatedOne).toBeDefined();
  expect(relatedMany.primary.relatedOne.id).toEqual(relatedOneId);
};

export const testListRelatedManiesRedactedForDifferentOwners = async (
  currentId: number,
  apiEndpoint: string,
  accessToken1: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken2, primaryId);
  await doCreateRelatedOne(apiEndpoint, accessToken2, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, accessToken1, relatedManyId, primaryId);

  const result = await doListRelatedManies(apiEndpoint, accessToken1, relatedManyId);
  const relatedMany = result.body.data?.listRelatedManies.items[0];

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

// #endregion
