import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { TestConfigOutput, TestOptions, setupTest, cleanupTest } from '../utils';
import { authConstructDependency } from '../__tests__/additional-dependencies';
import { OidcFieldAuthTester } from './tests-sources/sql-dynamic-model-auth/oidc-field-auth-tester';
import { stackConfig as generateStackConfig } from './tests-sources/sql-dynamic-model-auth/sql-oidc-auth-fields/stack-config';

export const testGraphQLAPIWithOIDCFields = (options: TestOptions, testBlockDescription: string, engine: ImportedRDSType): void => {
  describe(`${testBlockDescription} - ${engine}`, () => {
    let testConfigOutput: TestConfigOutput;
    let authTester: OidcFieldAuthTester;

    /**
     * This method will execute even if the TestProjectSourceStrategy is set to "reuse-existing". We want to perform a CDK deployment to
     * pick up any changed resources our schemas, to support local test troubleshooting. Internally, `setupTest` inspects the strategy to
     * determine whether it needs to create a brand-new CDK project or reuse an existing one.
     */
    beforeAll(async () => {
      const stackConfig = generateStackConfig(engine);

      // Suppress provisioned concurrency to save setup & teardown time
      stackConfig.sqlLambdaProvisionedConcurrencyConfig = false;

      testConfigOutput = await setupTest({
        options,
        stackConfig,
        additionalDependencies: [authConstructDependency],
      });

      authTester = new OidcFieldAuthTester(testConfigOutput);
      await authTester.initialize();
    });

    afterAll(async () => {
      if (testConfigOutput.projSourceStrategy.retain) {
        console.log(
          `Skipping CDK destroy because project source strategy is "retain". Project configuration:\n${JSON.stringify(
            testConfigOutput.projSourceStrategy,
            null,
            2,
          )}`,
        );
        return;
      }
      await cleanupTest(testConfigOutput);
    });

    test('Private model auth and allowed field operations', async () => {
      await authTester.testPrivateModelAllowedFieldOperations();
    });

    // test('Private model auth and restricted field operations', async () => {});

    // test('Owner model auth and allowed field operations', async () => {});

    // test('Owner model auth and restricted field operations', async () => {});

    // test('Custom owner model auth and allowed field operations', async () => {});

    // test('Custom owner model auth and restricted field operations', async () => {});

    // test('Custom list of owners model auth and allowed field operations', async () => {});

    // test('Custom list of owners model auth and restricted field operations', async () => {});

    // test('admin group protected model and allowed field operations', async () => {});

    // test('admin group protected model and restricted field operations', async () => {});

    // test('custom group field protected model and allowed field operations', async () => {});

    // test('custom group field protected model and restricted field operations', async () => {});

    // test('custom list of groups field protected model and allowed field operations', async () => {});

    // test('custom list of groups field protected model and restricted field operations', async () => {});
  });
};
