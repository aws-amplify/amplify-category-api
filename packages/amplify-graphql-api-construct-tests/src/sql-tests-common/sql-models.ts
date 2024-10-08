import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { TestConfigOutput, TestOptions, setupTest, cleanupTest } from '../utils/sql-test-config-helper';
import { stackConfig as generateStackConfig } from './tests-sources/sql-models/stack-config';
import { ModelsTester } from './tests-sources/sql-models/tester';

export const testGraphQLAPI = (options: TestOptions, testBlockDescription: string, engine: ImportedRDSType): void => {
  describe(`${testBlockDescription} - ${engine}`, () => {
    let testConfigOutput: TestConfigOutput;
    let tester: ModelsTester;

    beforeAll(async () => {
      testConfigOutput = await setupTest({
        options,
        stackConfig: generateStackConfig(),
      });

      tester = new ModelsTester(testConfigOutput);
      await tester.initialize();
    });

    afterAll(async () => {
      await cleanupTest(testConfigOutput);
    });

    test(`check CRUDL on todo table with default primary key - ${engine}`, async () => {
      await tester.testCRUDLOnToDoTableWithDefaultPrimaryKey();
    });

    test(`check CRUDL, filter, limit and nextToken on student table with composite key - ${engine}`, async () => {
      await tester.testCRUDLOnStudentTableWithCompositePrimaryKey();
    });

    test(`check SQL Lambda provisioned concurrency - ${engine}`, async () => {
      await tester.testSQLLambdaProvisionedConcurrency();
    });
  });
};
