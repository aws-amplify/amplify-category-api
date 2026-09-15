import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDestroy } from '../../../commands';
import { TestDefinition, writeStackConfig, writeTestDefinitions } from '../../../utils';
import { DURATION_1_HOUR } from '../../../utils/duration-constants';
import {
  deployStack,
  testPrimaryRetrievesCorrectRelationships,
  testRelatedManyRetrievesCorrectRelationships,
  testRelatedOneRetrievesCorrectRelationships,
} from './test-implementations';

jest.setTimeout(DURATION_1_HOUR);

describe('Models with multiple relationships', () => {
  const baseProjFolderName = path.basename(__filename, '.test.ts');

  describe('DDB primary, DDB related', () => {
    const projFolderName = `${baseProjFolderName}-ddb-primary-ddb-related`;
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

      const primarySchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'multi-relationship', 'schema-primary.graphql'),
      );
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'multi-relationship', 'schema-related.graphql'),
      );
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'ddb-prim-ddb-related': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackConfig(projRoot, { prefix: 'MultiRelDdbDdb', useSandbox: true });
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

    test('primary retrieves correct relationships', async () => {
      await testPrimaryRetrievesCorrectRelationships(currentId, apiEndpoint, apiKey);
    });

    test('relatedMany retrieves correct relationships', async () => {
      await testRelatedManyRetrievesCorrectRelationships(currentId, apiEndpoint, apiKey);
    });

    test('relatedOne retrieves correct relationships', async () => {
      await testRelatedOneRetrievesCorrectRelationships(currentId, apiEndpoint, apiKey);
    });
  });
});
