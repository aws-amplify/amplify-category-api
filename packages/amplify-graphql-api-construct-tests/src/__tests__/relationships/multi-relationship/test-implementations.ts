import { cdkDeploy } from '../../../commands';
import {
  doCreateRelatedOne,
  doCreateRelatedMany,
  doCreatePrimary,
} from '../../graphql-schemas/multi-relationship/operation-implementations';
import { ONE_MINUTE } from '../../../utils/duration-constants';

// #region Test setup
interface CommonSetupInput {
  projRoot: string;
  name: string;
}

interface CommonSetupOutput {
  apiEndpoint: string;
  apiKey: string;
}

export const deployStack = async (input: CommonSetupInput): Promise<CommonSetupOutput> => {
  const { projRoot, name } = input;
  const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
  const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

  const output: CommonSetupOutput = {
    apiEndpoint,
    apiKey,
  };

  return output;
};

// #endregion Test setup

// #region Test implementations

// All tests in this suite create relationships to assert that relationships are created correctly:
// primary1.relatedMany1 = relatedMany1, linked on primary1
// primary1.relatedMany2 = relatedMany2, linked on primary2
// primary1.relatedOne1 = relatedOne1, linked on primary1
// primary1.relatedOne2 = relatedOne2, linked on primary2
// primary2.relatedMany1 = relatedMany2, linked on primary1
// primary2.relatedMany2 = relatedMany1, linked on primary2
// primary2.relatedOne1 = relatedOne2, linked on primary1
// primary2.relatedOne2 = relatedOne1, linked on primary2

export const testPrimaryRetrievesCorrectRelationships = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const primary1Id = `p1-${currentId}`;
  const primary2Id = `p2-${currentId}`;
  const relatedMany1Id = `rm1-${currentId}`;
  const relatedMany2Id = `rm2-${currentId}`;
  const relatedOne1Id = `ro1-${currentId}`;
  const relatedOne2Id = `ro2-${currentId}`;

  // primary1.relatedMany1 = relatedMany1, linked on primary1
  // primary2.relatedMany2 = relatedMany1, linked on primary2
  await doCreateRelatedMany(apiEndpoint, apiKey, relatedMany1Id, primary1Id, primary2Id);

  // primary2.relatedMany1 = relatedMany2, linked on primary1
  // primary1.relatedMany2 = relatedMany2, linked on primary2
  await doCreateRelatedMany(apiEndpoint, apiKey, relatedMany2Id, primary2Id, primary1Id);

  // primary1.relatedOne1 = relatedOne1, linked on primary1
  // primary2.relatedOne2 = relatedOne1, linked on primary2
  await doCreateRelatedOne(apiEndpoint, apiKey, relatedOne1Id, primary1Id, primary2Id);

  // primary2.relatedOne1 = relatedOne2, linked on primary1
  // primary1.relatedOne2 = relatedOne2, linked on primary2
  await doCreateRelatedOne(apiEndpoint, apiKey, relatedOne2Id, primary2Id, primary1Id);

  const primary1Result = await doCreatePrimary(apiEndpoint, apiKey, primary1Id);
  const primary2Result = await doCreatePrimary(apiEndpoint, apiKey, primary2Id);

  const primary1 = primary1Result.body.data.createPrimary;
  expect(primary1).toBeDefined();
  expect(primary1.id).toEqual(primary1Id);
  expect(primary1.relatedMany1).toBeDefined();
  expect(primary1.relatedMany1.items.length).toEqual(1);
  expect(primary1.relatedMany1.items[0].id).toEqual(relatedMany1Id);
  expect(primary1.relatedMany2).toBeDefined();
  expect(primary1.relatedMany2.items.length).toEqual(1);
  expect(primary1.relatedMany2.items[0].id).toEqual(relatedMany2Id);
  expect(primary1.relatedOne1).toBeDefined();
  expect(primary1.relatedOne1.id).toEqual(relatedOne1Id);
  expect(primary1.relatedOne2).toBeDefined();
  expect(primary1.relatedOne2.id).toEqual(relatedOne2Id);

  const primary2 = primary2Result.body.data.createPrimary;
  expect(primary2).toBeDefined();
  expect(primary2.id).toEqual(primary2Id);
  expect(primary2.relatedMany1).toBeDefined();
  expect(primary2.relatedMany1.items.length).toEqual(1);
  expect(primary2.relatedMany1.items[0].id).toEqual(relatedMany2Id);
  expect(primary2.relatedMany2).toBeDefined();
  expect(primary2.relatedMany2.items.length).toEqual(1);
  expect(primary2.relatedMany2.items[0].id).toEqual(relatedMany1Id);
  expect(primary2.relatedOne1).toBeDefined();
  expect(primary2.relatedOne1.id).toEqual(relatedOne2Id);
  expect(primary2.relatedOne2).toBeDefined();
  expect(primary2.relatedOne2.id).toEqual(relatedOne1Id);
};

export const testRelatedManyRetrievesCorrectRelationships = async (
  currentId: number,
  apiEndpoint: string,
  apiKey: string,
): Promise<void> => {
  const primary1Id = `p1-${currentId}`;
  const primary2Id = `p2-${currentId}`;
  const relatedMany1Id = `rm1-${currentId}`;
  const relatedMany2Id = `rm2-${currentId}`;
  const relatedOne1Id = `ro1-${currentId}`;
  const relatedOne2Id = `ro2-${currentId}`;

  await doCreatePrimary(apiEndpoint, apiKey, primary1Id);
  await doCreatePrimary(apiEndpoint, apiKey, primary2Id);

  // primary1.relatedOne1 = relatedOne1, linked on primary1
  // primary2.relatedOne2 = relatedOne1, linked on primary2
  await doCreateRelatedOne(apiEndpoint, apiKey, relatedOne1Id, primary1Id, primary2Id);

  // primary2.relatedOne1 = relatedOne2, linked on primary1
  // primary1.relatedOne2 = relatedOne2, linked on primary2
  await doCreateRelatedOne(apiEndpoint, apiKey, relatedOne2Id, primary2Id, primary1Id);

  // primary1.relatedMany1 = relatedMany1, linked on primary1
  // primary2.relatedMany2 = relatedMany1, linked on primary2
  const relatedMany1Result = await doCreateRelatedMany(apiEndpoint, apiKey, relatedMany1Id, primary1Id, primary2Id);

  // primary2.relatedMany1 = relatedMany2, linked on primary1
  // primary1.relatedMany2 = relatedMany2, linked on primary2
  const relatedMany2Result = await doCreateRelatedMany(apiEndpoint, apiKey, relatedMany2Id, primary2Id, primary1Id);

  const relatedMany1 = relatedMany1Result.body.data.createRelatedMany;
  expect(relatedMany1).toBeDefined();
  expect(relatedMany1.id).toEqual(relatedMany1Id);
  expect(relatedMany1.primary1).toBeDefined();
  expect(relatedMany1.primary1.id).toEqual(primary1Id);
  expect(relatedMany1.primary2).toBeDefined();
  expect(relatedMany1.primary2.id).toEqual(primary2Id);

  const relatedMany2 = relatedMany2Result.body.data.createRelatedMany;
  expect(relatedMany2).toBeDefined();
  expect(relatedMany2.id).toEqual(relatedMany2Id);
  expect(relatedMany2.primary1).toBeDefined();
  expect(relatedMany2.primary1.id).toEqual(primary2Id);
  expect(relatedMany2.primary2).toBeDefined();
  expect(relatedMany2.primary2.id).toEqual(primary1Id);
};

export const testRelatedOneRetrievesCorrectRelationships = async (
  currentId: number,
  apiEndpoint: string,
  apiKey: string,
): Promise<void> => {
  const primary1Id = `p1-${currentId}`;
  const primary2Id = `p2-${currentId}`;
  const relatedMany1Id = `rm1-${currentId}`;
  const relatedMany2Id = `rm2-${currentId}`;
  const relatedOne1Id = `ro1-${currentId}`;
  const relatedOne2Id = `ro2-${currentId}`;

  await doCreatePrimary(apiEndpoint, apiKey, primary1Id);
  await doCreatePrimary(apiEndpoint, apiKey, primary2Id);

  // primary1.relatedMany1 = relatedMany1, linked on primary1
  // primary2.relatedMany2 = relatedMany1, linked on primary2
  await doCreateRelatedMany(apiEndpoint, apiKey, relatedMany1Id, primary1Id, primary2Id);

  // primary2.relatedMany1 = relatedMany2, linked on primary1
  // primary1.relatedMany2 = relatedMany2, linked on primary2
  await doCreateRelatedMany(apiEndpoint, apiKey, relatedMany2Id, primary2Id, primary1Id);

  // primary1.relatedOne1 = relatedOne1, linked on primary1
  // primary2.relatedOne2 = relatedOne1, linked on primary2
  const relatedOne1Result = await doCreateRelatedOne(apiEndpoint, apiKey, relatedOne1Id, primary1Id, primary2Id);

  // primary2.relatedOne1 = relatedOne2, linked on primary1
  // primary1.relatedOne2 = relatedOne2, linked on primary2
  const relatedOne2Result = await doCreateRelatedOne(apiEndpoint, apiKey, relatedOne2Id, primary2Id, primary1Id);

  const relatedOne1 = relatedOne1Result.body.data.createRelatedOne;
  expect(relatedOne1).toBeDefined();
  expect(relatedOne1.id).toEqual(relatedOne1Id);
  expect(relatedOne1.primary1).toBeDefined();
  expect(relatedOne1.primary1.id).toEqual(primary1Id);
  expect(relatedOne1.primary2).toBeDefined();
  expect(relatedOne1.primary2.id).toEqual(primary2Id);

  const relatedOne2 = relatedOne2Result.body.data.createRelatedOne;
  expect(relatedOne2).toBeDefined();
  expect(relatedOne2.id).toEqual(relatedOne2Id);
  expect(relatedOne2.primary1).toBeDefined();
  expect(relatedOne2.primary1.id).toEqual(primary2Id);
  expect(relatedOne2.primary2).toBeDefined();
  expect(relatedOne2.primary2.id).toEqual(primary1Id);
};

// #endregion Test implementations
