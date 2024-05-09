import { cdkDeploy } from '../../../commands';
import { addCognitoUserToGroup, createCognitoUser, signInCognitoUser } from '../../../utils';
import { ONE_MINUTE } from '../../../utils/duration-constants';
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
} from '../../graphql-schemas/reference-style-static-group-auth/operation-implementations';

// #region Test stack setup

export interface CommonSetupInput {
  projRoot: string;
  region: string;
  name: string;
}

export interface CommonSetupOutput {
  apiEndpoint: string;
  group1AccessToken: string;
  group2AccessToken: string;
  adminAccessToken: string;
}

export const deployStackAndCreateUsers = async (input: CommonSetupInput): Promise<CommonSetupOutput> => {
  const { projRoot, region, name } = input;
  const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
  const { awsAppsyncApiEndpoint, UserPoolClientId: userPoolClientId, UserPoolId: userPoolId } = outputs[name];

  const apiEndpoint = awsAppsyncApiEndpoint;

  const group1AccessToken = await createTestUser({
    groupName: 'Group1',
    region,
    userPoolId,
    userPoolClientId,
  });

  const group2AccessToken = await createTestUser({
    groupName: 'Group2',
    region,
    userPoolId,
    userPoolClientId,
  });

  const adminAccessToken = await createTestUser({
    groupName: 'Group3',
    region,
    userPoolId,
    userPoolClientId,
  });

  const output: CommonSetupOutput = {
    apiEndpoint,
    group1AccessToken,
    group2AccessToken,
    adminAccessToken,
  };

  return output;
};

interface CreateUserAndAssignToGroupInput {
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  groupName: string;
}

/** Creates a test user and assigns to the specified group */
const createTestUser = async (input: CreateUserAndAssignToGroupInput): Promise<string> => {
  const { region, userPoolId, userPoolClientId, groupName } = input;
  const { username, password } = await createCognitoUser({
    region,
    userPoolId,
  });

  await addCognitoUserToGroup({
    region,
    userPoolId,
    username,
    group: groupName,
  });

  const { accessToken } = await signInCognitoUser({
    username,
    password,
    region,
    userPoolClientId,
  });

  return accessToken;
};

// #endregion Test stack setup

// #region Primary operations

export const testCreatePrimaryDoesNotRedactRelated = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, adminAccessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, adminAccessToken, relatedManyId, primaryId);

  const result = await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);
  const primary = result.body.data.createPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);

  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testCreatePrimaryRedactsRelated = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId);

  const result = await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);
  const primary = result.body.data.createPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeNull();
};

export const testUpdatePrimaryDoesNotRedactRelated = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, adminAccessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, adminAccessToken, relatedManyId, primaryId);
  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);

  const result = await doUpdatePrimary(apiEndpoint, adminAccessToken, primaryId);
  const primary = result.body.data.updatePrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);

  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testUpdatePrimaryRedactsRelated = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId);

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);

  const result = await doUpdatePrimary(apiEndpoint, primaryAccessToken, primaryId);
  const primary = result.body.data.updatePrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeNull();
};

export const testGetPrimaryDoesNotRedactRelated = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, adminAccessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, adminAccessToken, relatedManyId, primaryId);
  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);

  const result = await doGetPrimary(apiEndpoint, adminAccessToken, primaryId);
  const primary = result.body.data.getPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);

  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testGetPrimaryRedactsRelated = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId);

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);

  const result = await doGetPrimary(apiEndpoint, primaryAccessToken, primaryId);
  const primary = result.body.data.getPrimary;

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeNull();
};

export const testListPrimariesDoesNotRedactRelated = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, adminAccessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, adminAccessToken, relatedManyId, primaryId);

  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);

  const result = await doListPrimaries(apiEndpoint, adminAccessToken, primaryId);
  expect(result.body.data.listPrimaries.items.length).toBe(1);
  const primary = result.body.data.listPrimaries.items[0];

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeDefined();
  expect(primary.relatedOne.id).toEqual(relatedOneId);

  expect(primary.relatedMany).toBeDefined();
  expect(primary.relatedMany.items.length).toEqual(1);
  expect(primary.relatedMany.items[0].id).toEqual(relatedManyId);
};

export const testListPrimariesRedactsRelated = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId);

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);

  const result = await doListPrimaries(apiEndpoint, primaryAccessToken, primaryId);
  expect(result.body.data.listPrimaries.items.length).toBe(1);
  const primary = result.body.data.listPrimaries.items[0];

  expect(primary).toBeDefined();
  expect(primary.id).toEqual(primaryId);
  expect(primary.relatedOne).toBeNull();
  expect(primary.relatedMany).toBeNull();
};

export const testCreatePrimaryIsForbidden = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;

  const result = await doCreatePrimary(apiEndpoint, accessToken, primaryId);
  const primary = result.body.data?.createPrimary;
  const errors = result.body.errors;
  expect(errors.length).toEqual(1);
  expect(errors[0].errorType).toEqual('Unauthorized');
  expect(primary).toBeNull();
};

// #endregion

// #region RelatedOne operations

export const testCreateRelatedOneDoesNotRedactPrimary = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);

  const result = await doCreateRelatedOne(apiEndpoint, adminAccessToken, relatedOneId, primaryId);
  const relatedOne = result.body.data?.createRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);
};

export const testCreateRelatedOneRedactsPrimary = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);

  const result = await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId);
  const relatedOne = result.body.data?.createRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

export const testUpdateRelatedOneDoesNotRedactPrimary = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);
  await doCreateRelatedOne(apiEndpoint, adminAccessToken, relatedOneId, primaryId);

  const result = await doUpdateRelatedOne(apiEndpoint, adminAccessToken, relatedOneId, primaryId);
  const relatedOne = result.body.data?.updateRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);
};

export const testUpdateRelatedOneRedactsPrimary = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId);

  const result = await doUpdateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId);
  const relatedOne = result.body.data?.updateRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

export const testGetRelatedOneDoesNotRedactPrimary = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);
  await doCreateRelatedOne(apiEndpoint, adminAccessToken, relatedOneId, primaryId);

  const result = await doGetRelatedOne(apiEndpoint, adminAccessToken, relatedOneId);
  const relatedOne = result.body.data?.getRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);
};

export const testGetRelatedOneRedactsPrimary = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId);

  const result = await doGetRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId);
  const relatedOne = result.body.data?.getRelatedOne;

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

export const testListRelatedOnesDoesNotRedactPrimary = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);

  await doCreateRelatedOne(apiEndpoint, adminAccessToken, relatedOneId, primaryId);

  const result = await doListRelatedOnes(apiEndpoint, adminAccessToken, relatedOneId);
  expect(result.body.data?.listRelatedOnes.items.length).toEqual(1);
  const relatedOne = result.body.data?.listRelatedOnes.items[0];

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeDefined();
  expect(relatedOne.primary.id).toEqual(primaryId);
};

export const testListRelatedOnesRedactsPrimary = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);

  await doCreateRelatedOne(apiEndpoint, relatedAccessToken, relatedOneId, primaryId);

  const result = await doListRelatedOnes(apiEndpoint, relatedAccessToken, relatedOneId);
  expect(result.body.data?.listRelatedOnes.items.length).toEqual(1);
  const relatedOne = result.body.data?.listRelatedOnes.items[0];

  expect(relatedOne).toBeDefined();
  expect(relatedOne.id).toEqual(relatedOneId);
  expect(relatedOne.primary).toBeNull();
};

export const testCreateRelatedOneIsForbidden = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedOneId = `ro${currentId}`;

  const result = await doCreateRelatedOne(apiEndpoint, accessToken, relatedOneId, primaryId);
  const relatedOne = result.body.data?.createRelatedOne;
  const errors = result.body.errors;
  expect(errors.length).toEqual(1);
  expect(errors[0].errorType).toEqual('Unauthorized');
  expect(relatedOne).toBeNull();
};

// #endregion

// #region RelatedMany operations

export const testCreateRelatedManyDoesNotRedactPrimary = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);

  const result = await doCreateRelatedMany(apiEndpoint, adminAccessToken, relatedManyId, primaryId);
  const relatedMany = result.body.data?.createRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);
};

export const testCreateRelatedManyRedactsPrimary = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);

  const result = await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId);
  const relatedMany = result.body.data?.createRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

export const testUpdateRelatedManyDoesNotRedactPrimary = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);
  await doCreateRelatedMany(apiEndpoint, adminAccessToken, relatedManyId, primaryId);

  const result = await doUpdateRelatedMany(apiEndpoint, adminAccessToken, relatedManyId, primaryId);
  const relatedMany = result.body.data?.updateRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);
};

export const testUpdateRelatedManyRedactsPrimary = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId);

  const result = await doUpdateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId);
  const relatedMany = result.body.data?.updateRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

export const testGetRelatedManyDoesNotRedactPrimary = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);
  await doCreateRelatedMany(apiEndpoint, adminAccessToken, relatedManyId, primaryId);

  const result = await doGetRelatedMany(apiEndpoint, adminAccessToken, relatedManyId);
  const relatedMany = result.body.data?.getRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);
};

export const testGetRelatedManyRedactsPrimary = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId);

  const result = await doGetRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId);
  const relatedMany = result.body.data?.getRelatedMany;

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeNull();
};

export const testListRelatedManiesDoesNotRedactPrimary = async (
  currentId: number,
  apiEndpoint: string,
  adminAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, adminAccessToken, primaryId);
  await doCreateRelatedMany(apiEndpoint, adminAccessToken, relatedManyId, primaryId);

  const result = await doListRelatedManies(apiEndpoint, adminAccessToken, relatedManyId);
  expect(result.body.data?.listRelatedManies.items.length).toEqual(1);
  const relatedMany = result.body.data?.listRelatedManies.items[0];

  expect(relatedMany).toBeDefined();
  expect(relatedMany.id).toEqual(relatedManyId);
  expect(relatedMany.primary).toBeDefined();
  expect(relatedMany.primary.id).toEqual(primaryId);
};

export const testListRelatedManiesRedactsPrimary = async (
  currentId: number,
  apiEndpoint: string,
  primaryAccessToken: string,
  relatedAccessToken: string,
): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `rm${currentId}`;

  await doCreatePrimary(apiEndpoint, primaryAccessToken, primaryId);
  await doCreateRelatedMany(apiEndpoint, relatedAccessToken, relatedManyId, primaryId);

  const result = await doListRelatedManies(apiEndpoint, relatedAccessToken, relatedManyId);
  expect(result.body.data?.listRelatedManies.items.length).toEqual(1);
  const relatedManies = result.body.data?.listRelatedManies.items[0];

  expect(relatedManies).toBeDefined();
  expect(relatedManies.id).toEqual(relatedManyId);
  expect(relatedManies.primary).toBeNull();
};

export const testCreateRelatedManyIsForbidden = async (currentId: number, apiEndpoint: string, accessToken: string): Promise<void> => {
  const primaryId = `p${currentId}`;
  const relatedManyId = `rm${currentId}`;

  const result = await doCreateRelatedMany(apiEndpoint, accessToken, relatedManyId, primaryId);
  const relatedOne = result.body.data?.createRelatedMany;
  const errors = result.body.errors;
  expect(errors.length).toEqual(1);
  expect(errors[0].errorType).toEqual('Unauthorized');
  expect(relatedOne).toBeNull();
};

// #endregion
