import { doAppSyncGraphqlMutation } from '../../utils';
import {
  createPrimary,
  createRelatedMany,
  createRelatedOne,
  updatePrimary,
  updateRelatedMany,
  updateRelatedOne,
} from './graphql-schemas/gen2/graphql/mutations';

export const testCreatePrimaryRedacted = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedOne,
    variables: {
      id: relatedOneId,
      primaryId,
      secret: 'relatedOne secret',
    },
  });

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedMany,
    variables: {
      id: relatedManyId,
      primaryId,
      secret: 'relatedMany secret',
    },
  });

  const result = await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createPrimary,
    variables: {
      id: primaryId,
      secret: 'primary secret',
    },
  });

  const primary = result.body.data.createPrimary;
  expect(primary).toBeDefined();
  expect(primary.id).toBeDefined();
  expect(primary.secret).toBeNull();
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(0);
};

export const testUpdatePrimaryRedacted = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedOne,
    variables: {
      id: relatedOneId,
      primaryId,
      secret: 'relatedOne secret',
    },
  });

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedMany,
    variables: {
      id: relatedManyId,
      primaryId,
      secret: 'relatedMany secret',
    },
  });

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createPrimary,
    variables: {
      id: primaryId,
      secret: 'primary secret',
    },
  });

  const result = await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: updatePrimary,
    variables: {
      id: primaryId,
      secret: 'primary secret updated',
    },
  });

  const primary = result.body.data.updatePrimary;
  expect(primary).toBeDefined();
  expect(primary.secret).toBeNull();
  expect(primary.id).toBeDefined();
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(0);
};

export const testCreateRelatedOneRedacted = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createPrimary,
    variables: {
      id: primaryId,
      secret: 'primary secret',
    },
  });

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedMany,
    variables: {
      id: relatedManyId,
      primaryId,
      secret: 'relatedMany secret',
    },
  });

  const result = await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedOne,
    variables: {
      id: relatedOneId,
      primaryId,
      secret: 'relatedOne secret',
    },
  });

  const relatedOne = result.body.data?.createRelatedOne;
  expect(relatedOne).toBeDefined();
  expect(relatedOne.secret).toBeNull();
  expect(relatedOne.id).toBeDefined();
  expect(relatedOne.primary).toBeNull();
};

export const testUpdateRelatedOneRedacted = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createPrimary,
    variables: {
      id: primaryId,
      secret: 'primary secret',
    },
  });

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedMany,
    variables: {
      id: relatedManyId,
      primaryId,
      secret: 'relatedMany secret',
    },
  });

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedOne,
    variables: {
      id: relatedOneId,
      primaryId,
      secret: 'relatedOne secret',
    },
  });

  const result = await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: updateRelatedOne,
    variables: {
      id: relatedOneId,
      primaryId,
      secret: 'relatedOne updated secret',
    },
  });

  const relatedOne = result.body.data?.updateRelatedOne;
  expect(relatedOne).toBeDefined();
  expect(relatedOne.secret).toBeNull();
  expect(relatedOne.id).toBeDefined();
  expect(relatedOne.primary).toBeNull();
};

export const testCreateRelatedManyRedacted = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createPrimary,
    variables: {
      id: primaryId,
      secret: 'primary secret',
    },
  });

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedOne,
    variables: {
      id: relatedOneId,
      primaryId,
      secret: 'relatedOne secret',
    },
  });

  const result = await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedMany,
    variables: {
      id: relatedManyId,
      primaryId,
      secret: 'relatedMany secret',
    },
  });

  const relatedMany = result.body.data?.createRelatedMany;
  expect(relatedMany).toBeDefined();
  expect(relatedMany.secret).toBeNull();
  expect(relatedMany.id).toBeDefined();
  expect(relatedMany.primary).toBeNull();
};

export const testUpdateRelatedManyRedacted = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createPrimary,
    variables: {
      id: primaryId,
      secret: 'primary secret',
    },
  });

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedOne,
    variables: {
      id: relatedOneId,
      primaryId,
      secret: 'relatedOne secret',
    },
  });

  await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: createRelatedMany,
    variables: {
      id: relatedManyId,
      primaryId,
      secret: 'relatedMany secret',
    },
  });

  const result = await doAppSyncGraphqlMutation({
    apiEndpoint,
    auth: { accessToken },
    query: updateRelatedMany,
    variables: {
      id: relatedManyId,
      primaryId,
      secret: 'relatedMany secret',
    },
  });

  const relatedMany = result.body.data?.updateRelatedMany;
  expect(relatedMany).toBeDefined();
  expect(relatedMany.secret).toBeNull();
  expect(relatedMany.id).toBeDefined();
  expect(relatedMany.primary).toBeNull();
};
