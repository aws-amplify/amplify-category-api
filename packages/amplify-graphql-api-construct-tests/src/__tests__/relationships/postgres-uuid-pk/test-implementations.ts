import { doAppSyncGraphqlMutation, doAppSyncGraphqlQuery } from '../../../utils';
import {
  createPrimary,
  createRelatedMany,
  createRelatedOne,
  deletePrimary,
  deleteRelatedMany,
  deleteRelatedOne,
  updatePrimary,
  updateRelatedMany,
  updateRelatedOne,
} from './graphql/mutations';
import { getPrimary, getRelatedMany, getRelatedOne } from './graphql/queries';

// =======================================================================
// Primary as source
// =======================================================================
// #region Primary as source model

export const testPrimaryWithRelatedWorks = async (apiEndpoint: string, apiKey: string): Promise<void> => {
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  const createPrimaryResult = await doAppSyncGraphqlMutation({ ...args, query: createPrimary, variables: {} });
  const createPrimaryErrors = createPrimaryResult.body.errors;
  expect(createPrimaryErrors).not.toBeDefined();
  const primary = createPrimaryResult.body.data.createPrimary;
  const primaryId = primary.id;

  const createRelatedOneResult = await doAppSyncGraphqlMutation({ ...args, query: createRelatedOne, variables: { primaryId } });
  const relatedOneId = createRelatedOneResult.body.data.createRelatedOne.id;

  const createRelatedManyResult = await doAppSyncGraphqlMutation({ ...args, query: createRelatedMany, variables: { primaryId } });
  const relatedManyId = createRelatedManyResult.body.data.createRelatedMany.id;

  const updateResult = await doAppSyncGraphqlMutation({ ...args, query: updatePrimary, variables: { id: primaryId } });
  const updated = updateResult.body.data.updatePrimary;
  const updateErrors = updateResult.body.errors;
  expect(updateErrors).not.toBeDefined();
  expect(updated).toBeDefined();
  expect(updated.id).toEqual(primaryId);
  expect(updated.relatedOne).toBeDefined();
  expect(updated.relatedOne.id).toEqual(relatedOneId);
  expect(updated.relatedMany.items).toBeDefined();
  expect(updated.relatedMany.items[0]).toBeDefined();
  expect(updated.relatedMany.items[0].id).toEqual(relatedManyId);

  const queryResult = await doAppSyncGraphqlQuery({ ...args, query: getPrimary, variables: { id: primaryId } });
  const queried = queryResult.body.data.getPrimary;
  const queryErrors = queryResult.body.errors;
  expect(queryErrors).not.toBeDefined();
  expect(queried).toBeDefined();
  expect(queried.id).toEqual(primaryId);
  expect(queried.relatedOne).toBeDefined();
  expect(queried.relatedOne.id).toEqual(relatedOneId);
  expect(queried.relatedMany.items).toBeDefined();
  expect(queried.relatedMany.items[0]).toBeDefined();
  expect(queried.relatedMany.items[0].id).toEqual(relatedManyId);

  const deleteResult = await doAppSyncGraphqlMutation({ ...args, query: deletePrimary, variables: { id: primaryId } });
  const deleted = deleteResult.body.data.deletePrimary;
  const deleteErrors = deleteResult.body.errors;
  expect(deleteErrors).not.toBeDefined();
  expect(deleted).toBeDefined();
  expect(deleted.id).toEqual(primaryId);
  expect(deleted.relatedOne).toBeDefined();
  expect(deleted.relatedOne.id).toEqual(relatedOneId);
  expect(deleted.relatedMany.items).toBeDefined();
  expect(deleted.relatedMany.items[0]).toBeDefined();
  expect(deleted.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testPrimaryWithNoRelatedWorks = async (apiEndpoint: string, apiKey: string): Promise<void> => {
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  const createPrimaryResult = await doAppSyncGraphqlMutation({ ...args, query: createPrimary, variables: {} });
  const createPrimaryErrors = createPrimaryResult.body.errors;
  expect(createPrimaryErrors).not.toBeDefined();
  const primary = createPrimaryResult.body.data.createPrimary;
  const primaryId = primary.id;
  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany.items.length).toEqual(0);

  const updateResult = await doAppSyncGraphqlMutation({ ...args, query: updatePrimary, variables: { id: primaryId } });
  const updated = updateResult.body.data.updatePrimary;
  const updateErrors = updateResult.body.errors;
  expect(updateErrors).not.toBeDefined();
  expect(updated).toBeDefined();
  expect(updated.id).toEqual(primaryId);
  expect(updated.relatedOne).toBeNull();
  expect(updated.relatedMany.items.length).toEqual(0);

  const queryResult = await doAppSyncGraphqlQuery({ ...args, query: getPrimary, variables: { id: primaryId } });
  const queried = queryResult.body.data.getPrimary;
  const queryErrors = queryResult.body.errors;
  expect(queryErrors).not.toBeDefined();
  expect(queried).toBeDefined();
  expect(queried.id).toEqual(primaryId);
  expect(queried.relatedOne).toBeNull();
  expect(queried.relatedMany.items.length).toEqual(0);

  const deleteResult = await doAppSyncGraphqlMutation({ ...args, query: deletePrimary, variables: { id: primaryId } });
  const deleted = deleteResult.body.data.deletePrimary;
  const deleteErrors = deleteResult.body.errors;
  expect(deleteErrors).not.toBeDefined();
  expect(deleted).toBeDefined();
  expect(deleted.id).toEqual(primaryId);
  expect(deleted.relatedOne).toBeNull();
  expect(deleted.relatedMany.items.length).toEqual(0);
};

// #endregion Primary as source model

// =======================================================================
// RelatedOne as source
// =======================================================================
// #region RelatedOne as source model

export const testRelatedOneWithPrimaryWorks = async (apiEndpoint: string, apiKey: string): Promise<void> => {
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  const createPrimaryResult = await doAppSyncGraphqlMutation({ ...args, query: createPrimary, variables: {} });
  const createPrimaryErrors = createPrimaryResult.body.errors;
  expect(createPrimaryErrors).not.toBeDefined();
  const primary = createPrimaryResult.body.data.createPrimary;
  const primaryId = primary.id;

  const createResult = await doAppSyncGraphqlMutation({ ...args, query: createRelatedOne, variables: { primaryId } });
  const created = createResult.body.data.createRelatedOne;
  const createErrors = createResult.body.errors;
  expect(createErrors).not.toBeDefined();
  const relatedOneId = created.id;
  expect(created).toBeDefined();
  expect(created.id).toBeDefined();
  expect(created.primary).toBeDefined();
  expect(created.primary.id).toEqual(primaryId);

  const updateResult = await doAppSyncGraphqlMutation({ ...args, query: updateRelatedOne, variables: { id: relatedOneId } });
  const updated = updateResult.body.data.updateRelatedOne;
  const updateErrors = updateResult.body.errors;
  expect(updateErrors).not.toBeDefined();
  expect(updated).toBeDefined();
  expect(updated.id).toEqual(relatedOneId);
  expect(updated.primary).toBeDefined();
  expect(updated.primary.id).toEqual(primaryId);

  const queryResult = await doAppSyncGraphqlQuery({ ...args, query: getRelatedOne, variables: { id: relatedOneId } });
  const queried = queryResult.body.data.getRelatedOne;
  const queryErrors = queryResult.body.errors;
  expect(queryErrors).not.toBeDefined();
  expect(queried).toBeDefined();
  expect(queried.id).toEqual(relatedOneId);
  expect(queried.primary).toBeDefined();
  expect(queried.primary.id).toEqual(primaryId);

  const deleteResult = await doAppSyncGraphqlMutation({ ...args, query: deleteRelatedOne, variables: { id: relatedOneId } });
  const deleted = deleteResult.body.data.deleteRelatedOne;
  const deleteErrors = deleteResult.body.errors;
  expect(deleteErrors).not.toBeDefined();
  expect(deleted).toBeDefined();
  expect(deleted.id).toEqual(relatedOneId);
  expect(deleted.primary).toBeDefined();
  expect(deleted.primary.id).toEqual(primaryId);
};

export const testRelatedOneWithNoPrimaryWorks = async (apiEndpoint: string, apiKey: string): Promise<void> => {
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  const createResult = await doAppSyncGraphqlMutation({ ...args, query: createRelatedOne, variables: {} });
  const created = createResult.body.data.createRelatedOne;
  const createErrors = createResult.body.errors;
  expect(createErrors).not.toBeDefined();
  const relatedOneId = created.id;
  expect(created).toBeDefined();
  expect(created.id).toBeDefined();
  expect(created.primary).toBeNull();

  const updateResult = await doAppSyncGraphqlMutation({ ...args, query: updateRelatedOne, variables: { id: relatedOneId } });
  const updated = updateResult.body.data.updateRelatedOne;
  const updateErrors = updateResult.body.errors;
  expect(updateErrors).not.toBeDefined();
  expect(updated).toBeDefined();
  expect(updated.id).toEqual(relatedOneId);
  expect(updated.primary).toBeNull();

  const queryResult = await doAppSyncGraphqlQuery({ ...args, query: getRelatedOne, variables: { id: relatedOneId } });
  const queried = queryResult.body.data.getRelatedOne;
  const queryErrors = queryResult.body.errors;
  expect(queryErrors).not.toBeDefined();
  expect(queried).toBeDefined();
  expect(queried.id).toEqual(relatedOneId);
  expect(queried.primary).toBeNull();

  const deleteResult = await doAppSyncGraphqlMutation({ ...args, query: deleteRelatedOne, variables: { id: relatedOneId } });
  const deleted = deleteResult.body.data.deleteRelatedOne;
  const deleteErrors = deleteResult.body.errors;
  expect(deleteErrors).not.toBeDefined();
  expect(deleted).toBeDefined();
  expect(deleted.id).toEqual(relatedOneId);
  expect(deleted.primary).toBeNull();
};

// #endregion RelatedOne as source model

// =======================================================================
// RelatedMany as source
// =======================================================================
// #region RelatedMany as source model

export const testRelatedManyWithPrimaryWorks = async (apiEndpoint: string, apiKey: string): Promise<void> => {
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  const createPrimaryResult = await doAppSyncGraphqlMutation({ ...args, query: createPrimary, variables: {} });
  const createPrimaryErrors = createPrimaryResult.body.errors;
  expect(createPrimaryErrors).not.toBeDefined();
  const primary = createPrimaryResult.body.data.createPrimary;
  const primaryId = primary.id;

  const createResult = await doAppSyncGraphqlMutation({ ...args, query: createRelatedMany, variables: { primaryId } });
  const created = createResult.body.data.createRelatedMany;
  const createErrors = createResult.body.errors;
  expect(createErrors).not.toBeDefined();
  const relatedManyId = created.id;
  expect(created).toBeDefined();
  expect(created.id).toBeDefined();
  expect(created.primary).toBeDefined();
  expect(created.primary.id).toEqual(primaryId);

  const updateResult = await doAppSyncGraphqlMutation({ ...args, query: updateRelatedMany, variables: { id: relatedManyId } });
  const updated = updateResult.body.data.updateRelatedMany;
  const updateErrors = updateResult.body.errors;
  expect(updateErrors).not.toBeDefined();
  expect(updated).toBeDefined();
  expect(updated.id).toEqual(relatedManyId);
  expect(updated.primary).toBeDefined();
  expect(updated.primary.id).toEqual(primaryId);

  const queryResult = await doAppSyncGraphqlQuery({ ...args, query: getRelatedMany, variables: { id: relatedManyId } });
  const queried = queryResult.body.data.getRelatedMany;
  const queryErrors = queryResult.body.errors;
  expect(queryErrors).not.toBeDefined();
  expect(queried).toBeDefined();
  expect(queried.id).toEqual(relatedManyId);
  expect(queried.primary).toBeDefined();
  expect(queried.primary.id).toEqual(primaryId);

  const deleteResult = await doAppSyncGraphqlMutation({ ...args, query: deleteRelatedMany, variables: { id: relatedManyId } });
  const deleted = deleteResult.body.data.deleteRelatedMany;
  const deleteErrors = deleteResult.body.errors;
  expect(deleteErrors).not.toBeDefined();
  expect(deleted).toBeDefined();
  expect(deleted.id).toEqual(relatedManyId);
  expect(deleted.primary).toBeDefined();
  expect(deleted.primary.id).toEqual(primaryId);
};

export const testRelatedManyWithNoPrimaryWorks = async (apiEndpoint: string, apiKey: string): Promise<void> => {
  const args = {
    apiEndpoint,
    auth: { apiKey: apiKey },
  };

  const createResult = await doAppSyncGraphqlMutation({ ...args, query: createRelatedMany, variables: {} });
  const created = createResult.body.data.createRelatedMany;
  const relatedManyId = created.id;
  const createErrors = createResult.body.errors;
  expect(createErrors).not.toBeDefined();
  expect(created).toBeDefined();
  expect(created.id).toBeDefined();
  expect(created.primary).toBeNull();

  const updateResult = await doAppSyncGraphqlMutation({ ...args, query: updateRelatedMany, variables: { id: relatedManyId } });
  const updated = updateResult.body.data.updateRelatedMany;
  const updateErrors = updateResult.body.errors;
  expect(updateErrors).not.toBeDefined();
  expect(updated).toBeDefined();
  expect(updated.id).toEqual(relatedManyId);
  expect(updated.primary).toBeNull();

  const queryResult = await doAppSyncGraphqlQuery({ ...args, query: getRelatedMany, variables: { id: relatedManyId } });
  const queried = queryResult.body.data.getRelatedMany;
  const queryErrors = queryResult.body.errors;
  expect(queryErrors).not.toBeDefined();
  expect(queried).toBeDefined();
  expect(queried.id).toEqual(relatedManyId);
  expect(queried.primary).toBeNull();

  const deleteResult = await doAppSyncGraphqlMutation({ ...args, query: deleteRelatedMany, variables: { id: relatedManyId } });
  const deleted = deleteResult.body.data.deleteRelatedMany;
  const deleteErrors = deleteResult.body.errors;
  expect(deleteErrors).not.toBeDefined();
  expect(deleted).toBeDefined();
  expect(deleted.id).toEqual(relatedManyId);
  expect(deleted.primary).toBeNull();
};

// #endregion RelatedMany as source model
