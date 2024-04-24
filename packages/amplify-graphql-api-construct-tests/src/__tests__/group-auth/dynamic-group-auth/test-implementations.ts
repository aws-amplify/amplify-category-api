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
} from '../../graphql-schemas/reference-style-dynamic-group-auth/operation-implementations';

// #region Primary operations

export const testCreatePrimaryDoesNotRedactRelatedForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);

  const result = await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);
  const primary = result.body.data.createPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);

  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testCreatePrimaryRedactsRelatedForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId, ['Group2']);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId, ['Group2']);

  const result = await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);
  const primary = result.body.data.createPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(0);
};

export const testGetPrimaryDoesNotRedactRelatedForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);
  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);

  const result = await doGetPrimary(apiEndpoint, accessToken, primaryId);
  const primary = result.body.data.getPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);

  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testGetPrimaryRedactsRelatedForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId, ['Group1']);
  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);

  const result = await doGetPrimary(apiEndpoint, primaryAccessToken, primaryId);
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
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);

  const result = await doGetPrimary(apiEndpoint, relatedAccessToken, primaryId);
  const primary = result.body.data.getPrimary;
  const errors = result.body.errors;
  expect(errors.length).toEqual(1);
  expect(errors[0].errorType).toEqual('Unauthorized');
  expect(primary).toBeNull();
};

export const testListPrimariesDoesNotRedactRelatedForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);
  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);

  const result = await doListPrimaries(apiEndpoint, accessToken, primaryId);
  expect(result.body.data.listPrimaries.items.length).toEqual(1);
  const primary = result.body.data.listPrimaries.items[0];

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);

  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testListPrimariesRedactsRelatedForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId, ['Group1']);
  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);

  const result = await doListPrimaries(apiEndpoint, primaryAccessToken, primaryId);
  expect(result.body.data.listPrimaries.items.length).toEqual(1);
  const primary = result.body.data.listPrimaries.items[0];

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(0);
};

export const testListPrimariesRedactsTopLevelItemsForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);

  const result = await doListPrimaries(apiEndpoint, relatedAccessToken, primaryId);
  expect(result.body.data.listPrimaries.items.length).toEqual(0);
};

export const testOwningGroupCanGrantOtherGroupsPermissions = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, primaryAccessToken, relatedOneId, primaryId, ['Group1', 'Group2']);
  await doCreateRelatedMany(apiEndpoint, primaryAccessToken, relatedManyId, primaryId, ['Group1', 'Group2']);
  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1', 'Group2']);

  const result = await doGetPrimary(apiEndpoint, relatedAccessToken, primaryId);
  const primary = result.body.data.getPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);

  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testUpdatePrimaryDoesNotRedactRelatedForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);
  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);

  const result = await doUpdatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);
  const primary = result.body.data.updatePrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);

  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testUpdatePrimaryRedactsRelatedForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId, ['Group2']);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId, ['Group2']);
  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);

  const result = await doUpdatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);
  const primary = result.body.data.updatePrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(0);
};

// #endregion

// #region RelatedOne operations

export const testCreateRelatedOneDoesNotRedactPrimaryForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);

  const result = await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);
  const relatedOne = result.body.data.createRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);

  expect(relatedOne.primary.relatedMany).toBeDefined();
  expect(relatedOne.primary.relatedMany.items.length).toEqual(1);
  expect(relatedOne.primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testCreateRelatedOneRedactsPrimaryForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);

  const result = await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId, ['Group2']);
  const relatedOne = result.body.data.createRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

export const testGetRelatedOneDoesNotRedactPrimaryForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);

  const result = await doGetRelatedOne(apiEndpoint, accessToken, relatedOneId);
  const relatedOne = result.body.data.getRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);

  expect(relatedOne.primary.relatedMany).toBeDefined();
  expect(relatedOne.primary.relatedMany.items.length).toEqual(1);
  expect(relatedOne.primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testGetRelatedOneRedactsPrimaryForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);
  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId, ['Group2']);

  const result = await doGetRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId);
  const relatedOne = result.body.data.getRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

export const testListRelatedOnesDoesNotRedactPrimaryForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);

  const result = await doListRelatedOnes(apiEndpoint, accessToken, relatedOneId);
  expect(result.body.data.listRelatedOnes.items.length).toEqual(1);
  const relatedOne = result.body.data.listRelatedOnes.items[0];

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);

  expect(relatedOne.primary.relatedMany).toBeDefined();
};

export const testListRelatedOnesRedactsPrimaryForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);
  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId, ['Group2']);

  const result = await doListRelatedOnes(apiEndpoint, relatedAccessToken, relatedOneId);
  expect(result.body.data.listRelatedOnes.items.length).toEqual(1);
  const relatedOne = result.body.data.listRelatedOnes.items[0];

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

export const testUpdateRelatedOneDoesNotRedactPrimaryForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);

  const result = await doUpdateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);
  const relatedOne = result.body.data.updateRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);

  expect(relatedOne.primary.relatedMany).toBeDefined();
  expect(relatedOne.primary.relatedMany.items.length).toEqual(1);
  expect(relatedOne.primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testUpdateRelatedOneRedactsPrimaryForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);
  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId, ['Group2']);

  const result = await doUpdateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId, ['Group2']);
  const relatedOne = result.body.data.updateRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

// #endregion

// #region RelatedMany operations

export const testCreateRelatedManyDoesNotRedactPrimaryForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);

  const result = await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);
  const relatedMany = result.body.data.createRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);

  expect(relatedMany.primary.relatedOne).toBeDefined();
  expect(relatedMany.primary.relatedOne.id).toEqual(relatedOneId);
};

export const testCreateRelatedManyRedactsPrimaryForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);

  const result = await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId, ['Group2']);
  const relatedMany = result.body.data.createRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

export const testGetRelatedManyDoesNotRedactPrimaryForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);

  const result = await doGetRelatedMany(apiEndpoint, accessToken, relatedManyId);
  const relatedMany = result.body.data.getRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);

  expect(relatedMany.primary.relatedOne).toBeDefined();
  expect(relatedMany.primary.relatedOne.id).toEqual(relatedOneId);
};

export const testGetRelatedManyRedactsPrimaryForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId, ['Group2']);

  const result = await doGetRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId);
  const relatedMany = result.body.data.getRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

export const testListRelatedManiesDoesNotRedactPrimaryForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);

  const result = await doListRelatedManies(apiEndpoint, accessToken, relatedManyId);
  expect(result.body.data.listRelatedManies.items.length).toEqual(1);
  const relatedMany = result.body.data.listRelatedManies.items[0];

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);

  expect(relatedMany.primary.relatedOne).toBeDefined();
  expect(relatedMany.primary.relatedOne.id).toEqual(relatedOneId);
};

export const testListRelatedManiesRedactsPrimaryForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId, ['Group2']);

  const result = await doListRelatedManies(apiEndpoint, relatedAccessToken, relatedManyId);
  expect(result.body.data.listRelatedManies.items.length).toEqual(1);
  const relatedMany = result.body.data.listRelatedManies.items[0];

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

export const testUpdateRelatedManyDoesNotRedactPrimaryForSameOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId, ['Group1']);
  await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);

  const result = await doUpdateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId, ['Group1']);
  const relatedMany = result.body.data.updateRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);

  expect(relatedMany.primary.relatedOne).toBeDefined();
  expect(relatedMany.primary.relatedOne.id).toEqual(relatedOneId);
};

export const testUpdateRelatedManyRedactsPrimaryForDifferentOwningGroup = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId, ['Group1']);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId, ['Group2']);

  const result = await doUpdateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId, ['Group2']);
  const relatedMany = result.body.data.updateRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

// #endregion