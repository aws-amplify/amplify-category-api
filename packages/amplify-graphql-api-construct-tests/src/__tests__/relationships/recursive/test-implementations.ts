import { cdkDeploy } from '../../../commands';
import { doCreateTreeNode, doGetTreeNode } from '../../graphql-schemas/recursive/operation-implementations';
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

interface TestTreeIds {
  readonly rootId: string;

  // Level 1: child
  readonly l1Child1Id: string;
  readonly l1Child2Id: string;

  // Level 2: grandchild
  readonly l2Child1Child1Id: string;
  readonly l2Child1Child2Id: string;
  readonly l2Child2Child1Id: string;
  readonly l2Child2Child2Id: string;
}

const createTree = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<TestTreeIds> => {
  const ids: TestTreeIds = {
    rootId: `r1-${currentId}`,

    l1Child1Id: `l1c1-${currentId}`,
    l2Child1Child1Id: `l2c1c1-${currentId}`,
    l2Child1Child2Id: `l2c1c2-${currentId}`,

    l1Child2Id: `l1c2-${currentId}`,
    l2Child2Child1Id: `l2c2c1-${currentId}`,
    l2Child2Child2Id: `l2c2c2-${currentId}`,
  };

  // Create root
  await doCreateTreeNode(apiEndpoint, apiKey, ids.rootId);

  // Create children
  const l1Promises = [ids.l1Child1Id, ids.l1Child2Id].map((id) => doCreateTreeNode(apiEndpoint, apiKey, id, ids.rootId));
  await Promise.all(l1Promises);

  // Create grandchildren of child1
  const l2Child1Promises = [ids.l2Child1Child1Id, ids.l2Child1Child2Id].map((id) =>
    doCreateTreeNode(apiEndpoint, apiKey, id, ids.l1Child1Id),
  );
  await Promise.all(l2Child1Promises);

  // Create grandchildren of child2
  const l2Child2Promises = [ids.l2Child2Child1Id, ids.l2Child2Child2Id].map((id) =>
    doCreateTreeNode(apiEndpoint, apiKey, id, ids.l1Child2Id),
  );
  await Promise.all(l2Child2Promises);

  return ids;
};

export const testCanNavigateToLeafFromRoot = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const ids = await createTree(currentId, apiEndpoint, apiKey);

  const rootResult = await doGetTreeNode(apiEndpoint, apiKey, ids.rootId);
  const root = rootResult.body.data.getTreeNode;

  expect(root).toBeDefined();
  expect(root.id).toEqual(ids.rootId);
  expect(root.children.items.length).toEqual(2);

  const l1ChildIds = root.children.items.map((c) => c.id);
  expect(l1ChildIds).toContain(ids.l1Child1Id);
  expect(l1ChildIds).toContain(ids.l1Child2Id);

  // Selection set is only 4 deep, so we'll get "grandchildren" from a separate query
  const l1Child1Result = await doGetTreeNode(apiEndpoint, apiKey, ids.l1Child1Id);
  const l1Child1 = l1Child1Result.body.data.getTreeNode;
  expect(l1Child1).toBeDefined();
  expect(l1Child1).toBeDefined();
  expect(l1Child1.id).toEqual(ids.l1Child1Id);
  expect(l1Child1.children.items.length).toEqual(2);

  const l1Child1ChildIds = l1Child1.children.items.map((c) => c.id);
  expect(l1Child1ChildIds).toContain(ids.l2Child1Child1Id);
  expect(l1Child1ChildIds).toContain(ids.l2Child1Child2Id);
};

export const testCanNavigateToRootFromLeaf = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const ids = await createTree(currentId, apiEndpoint, apiKey);

  const l2Child2Child2Result = await doGetTreeNode(apiEndpoint, apiKey, ids.l2Child2Child2Id);
  const l2Child2Child2 = l2Child2Child2Result.body.data.getTreeNode;

  expect(l2Child2Child2).toBeDefined();
  expect(l2Child2Child2.id).toEqual(ids.l2Child2Child2Id);

  const l1Child2 = l2Child2Child2.parent;
  expect(l1Child2).toBeDefined();
  expect(l1Child2.id).toEqual(ids.l1Child2Id);

  const root = l2Child2Child2.parent.parent;
  expect(root).toBeDefined();
  expect(root.id).toEqual(ids.rootId);
  expect(root.parent).toBeNull();
  expect(root.parentId).toBeNull();
};

export const testCanNavigateBetweenLeafNodes = async (currentId: number, apiEndpoint: string, apiKey: string): Promise<void> => {
  const ids = await createTree(currentId, apiEndpoint, apiKey);

  const l2Child2Child2Result = await doGetTreeNode(apiEndpoint, apiKey, ids.l2Child2Child2Id);
  const l2Child2Child2 = l2Child2Child2Result.body.data.getTreeNode;

  expect(l2Child2Child2).toBeDefined();

  const l1Child2 = l2Child2Child2.parent;
  const l2Child2Child1 = l1Child2.children.items.find((node) => node.id === ids.l2Child2Child1Id);
  expect(l2Child2Child1).toBeDefined();
  expect(l2Child2Child1.parentId).toEqual(ids.l1Child2Id);
};

// #endregion Test implementations
