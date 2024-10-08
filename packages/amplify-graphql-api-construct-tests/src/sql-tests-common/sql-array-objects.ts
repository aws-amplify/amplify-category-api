import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { TestConfigOutput, TestOptions, setupTest, cleanupTest } from '../utils/sql-test-config-helper';
import { stackConfig as generateStackConfig } from './tests-sources/sql-array-objects/stack-config';
import { ArrayObjectsTester } from './tests-sources/sql-array-objects/tester';

export const testGraphQLAPIArrayAndObjects = (options: TestOptions, testBlockDescription: string, engine: ImportedRDSType): void => {
  describe(`${testBlockDescription} - ${engine}`, () => {
    let testConfigOutput: TestConfigOutput;
    let tester: ArrayObjectsTester;

    beforeAll(async () => {
      testConfigOutput = await setupTest({
        options,
        stackConfig: generateStackConfig(engine),
      });

      tester = new ArrayObjectsTester(testConfigOutput);
      await tester.initialize();
    });

    afterAll(async () => {
      await cleanupTest(testConfigOutput);
    });

    test(`check CRUDL on contact table with array and objects - ${engine}`, async () => {
      await tester.testCRUDLOnContactTableWithArrayAndObjects();
    });

    test(`check SQL Lambda provisioned concurrency - ${engine}`, async () => {
      await tester.testSQLLambdaProvisionedConcurrency();
    });
  });
};
