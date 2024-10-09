import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { TestConfigOutput, TestOptions, setupTest, cleanupTest } from '../utils/sql-test-config-helper';
import { stackConfig as generateStackConfig } from './tests-sources/sql-auto-increment/stack-config';
import { AutoIncrementTester } from './tests-sources/sql-auto-increment/tester';

export const testGraphQLAPIAutoIncrement = (options: TestOptions, testBlockDescription: string, engine: ImportedRDSType): void => {
  describe(`${testBlockDescription} - ${engine}`, () => {
    let testConfigOutput: TestConfigOutput;
    let tester: AutoIncrementTester;

    beforeAll(async () => {
      testConfigOutput = await setupTest({
        options,
        stackConfig: generateStackConfig(),
      });

      tester = new AutoIncrementTester(testConfigOutput);
      await tester.initialize();
    });

    afterAll(async () => {
      await cleanupTest(testConfigOutput);
    });

    test(`check CRUDL on coffee queue table with auto increment primary key - ${engine}`, async () => {
      await tester.testCRUDLOnCoffeeQueueTableWithAutoIncrementPK();
    });
  });
};
