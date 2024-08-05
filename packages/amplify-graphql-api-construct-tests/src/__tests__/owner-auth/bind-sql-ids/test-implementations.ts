import {
  doCreatePrimary,
  doCreateRelatedMany,
  doCreateRelatedOne,
  doGetPrimary,
  doGetRelatedMany,
  doGetRelatedOne,
  doListRelatedManies,
  doListRelatedOnes,
  doUpdateRelatedMany,
  doUpdateRelatedOne,
} from '../../graphql-schemas/reference-style-owner-auth/operation-implementations';

export const testProtectsHasMany = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedId = `r${currentId}`;

  const injectionId = `'); select * from \`Primary\` where \`Primary.id\` = '${primaryId}'`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId);

  const doCreateRelatedResult = await doCreateRelatedMany(apiEndpoint, accessToken2, relatedId, injectionId);
  const createRelatedResult = doCreateRelatedResult.body.data.createRelatedMany;
  expect(createRelatedResult).toBeDefined();
  expect(createRelatedResult.id).toEqual(relatedId);
  expect(createRelatedResult.primary).toBeNull();

  const doGetRelatedResult = await doGetRelatedMany(apiEndpoint, accessToken2, relatedId);
  const getRelatedResult = doGetRelatedResult.body.data.getRelatedMany;
  expect(getRelatedResult).toBeDefined();
  expect(getRelatedResult.id).toEqual(relatedId);
  expect(getRelatedResult.primary).toBeNull();

  const doListRelatedResult = await doListRelatedManies(apiEndpoint, accessToken2, relatedId);
  const listRelatedResult = doListRelatedResult.body.data.listRelatedManies;
  expect(listRelatedResult.items.length).toEqual(1);
  expect(listRelatedResult.items[0].id).toEqual(relatedId);
  expect(listRelatedResult.items[0].primary).toBeNull();

  const doUpdateRelatedResult = await doUpdateRelatedMany(apiEndpoint, accessToken2, relatedId, injectionId);
  const updateRelatedResult = doUpdateRelatedResult.body.data.updateRelatedMany;
  expect(updateRelatedResult).toBeDefined();
  expect(updateRelatedResult.id).toEqual(relatedId);
  expect(updateRelatedResult.primary).toBeNull();

  const getPrimaryResult = await doGetPrimary(apiEndpoint, accessToken, primaryId);
  const primary = getPrimaryResult.body.data.getPrimary;
  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
};

export const testProtectsHasOne = async (
  currentId: number,
  apiEndpoint: string,
  accessToken: string,
  accessToken2: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedId = `r${currentId}`;

  const injectionId = `'); select * from \`Primary\` where \`Primary.id\` = '${primaryId}'`;

  await doCreatePrimary(apiEndpoint, accessToken, primaryId);

  const doCreateRelatedResult = await doCreateRelatedOne(apiEndpoint, accessToken2, relatedId, injectionId);
  const createRelatedResult = doCreateRelatedResult.body.data.createRelatedOne;
  expect(createRelatedResult).toBeDefined();
  expect(createRelatedResult.id).toEqual(relatedId);
  expect(createRelatedResult.primary).toBeNull();

  const doGetRelatedResult = await doGetRelatedOne(apiEndpoint, accessToken2, relatedId);
  const getRelatedResult = doGetRelatedResult.body.data.getRelatedOne;
  expect(getRelatedResult).toBeDefined();
  expect(getRelatedResult.id).toEqual(relatedId);
  expect(getRelatedResult.primary).toBeNull();

  const doListRelatedResult = await doListRelatedOnes(apiEndpoint, accessToken2, relatedId);
  const listRelatedResult = doListRelatedResult.body.data.listRelatedOnes;
  expect(listRelatedResult.items.length).toEqual(1);
  expect(listRelatedResult.items[0].id).toEqual(relatedId);
  expect(listRelatedResult.items[0].primary).toBeNull();

  const doUpdateRelatedResult = await doUpdateRelatedOne(apiEndpoint, accessToken2, relatedId, injectionId);
  const updateRelatedResult = doUpdateRelatedResult.body.data.updateRelatedOne;
  expect(updateRelatedResult).toBeDefined();
  expect(updateRelatedResult.id).toEqual(relatedId);
  expect(updateRelatedResult.primary).toBeNull();

  const getPrimaryResult = await doGetPrimary(apiEndpoint, accessToken, primaryId);
  const primary = getPrimaryResult.body.data.getPrimary;
  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
};
