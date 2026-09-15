import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDestroy } from '../../../commands';
import { TestDefinition, writeStackConfig, writeTestDefinitions } from '../../../utils';
import { DURATION_1_HOUR } from '../../../utils/duration-constants';
import {
  deployStack,
  testCanNavigateBetweenLeafNodes,
  testCanNavigateToLeafFromRoot,
  testCanNavigateToRootFromLeaf,
} from './test-implementations';

jest.setTimeout(DURATION_1_HOUR);

describe('Models with recursive relationships', () => {
  const baseProjFolderName = path.basename(__filename, '.test.ts');

  describe('DDB', () => {
    const projFolderName = `${baseProjFolderName}-ddb`;
    let apiEndpoint: string;
    let apiKey: string;
    let currentId: number;
    let projRoot: string;

    beforeEach(() => {
      currentId = Date.now();
    });

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', '..', 'backends', 'configurable-stack'));
      const name = await initCDKProject(projRoot, templatePath);

      const schemaPath = path.resolve(path.join(__dirname, '..', '..', 'graphql-schemas', 'recursive', 'schema.graphql'));
      const schema = fs.readFileSync(schemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        ddb: {
          schema,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackConfig(projRoot, { prefix: 'RecursiveDdb', useSandbox: true });
      writeTestDefinitions(testDefinitions, projRoot);

      const testConfig = await deployStack({
        projRoot,
        name,
      });

      apiEndpoint = testConfig.apiEndpoint;
      apiKey = testConfig.apiKey;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    test('can navigate to leaf from root', async () => {
      await testCanNavigateToLeafFromRoot(currentId, apiEndpoint, apiKey);
    });

    test('can navigate to root from leaf', async () => {
      await testCanNavigateToRootFromLeaf(currentId, apiEndpoint, apiKey);
    });

    test('can navigate between leaf nodes', async () => {
      await testCanNavigateBetweenLeafNodes(currentId, apiEndpoint, apiKey);
    });
  });
});
