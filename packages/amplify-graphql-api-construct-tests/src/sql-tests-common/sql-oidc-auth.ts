import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { DynamicModelAuthTester } from './tests-sources/sql-dynamic-model-auth/tester';
import { TestConfigOutput, TestOptions, setupTest, cleanupTest } from '../utils/sql-test-config-helper';
import { stackConfig as generateStackConfig } from './tests-sources//sql-dynamic-model-auth/sql-oidc-auth/stack-config';
import { authConstructDependency } from '../__tests__/additional-dependencies';

export const testGraphQLAPIWithOIDCAccess = (options: TestOptions, testBlockDescription: string, engine: ImportedRDSType): void => {
  describe(`${testBlockDescription} - ${engine}`, () => {
    let testConfigOutput: TestConfigOutput;
    let authTester: DynamicModelAuthTester;

    beforeAll(async () => {
      testConfigOutput = await setupTest({
        options,
        stackConfig: generateStackConfig(engine),
        additionalDependencies: [authConstructDependency],
      });

      authTester = new DynamicModelAuthTester(testConfigOutput);
      await authTester.initialize();
    });

    afterAll(async () => {
      await cleanupTest(testConfigOutput);
    });

    test('logged in user can perform CRUD and subscription operations', async () => {
      await authTester.testLoggedInUserCrudOperations();
    });

    test('owner of a record can perform CRUD and subscription operations using default owner field', async () => {
      await authTester.testRecordOwnerCrudOperationsWithDefaultOwnerField();
    });

    test('non-owner of a record cannot access or subscribe to it using default owner field', async () => {
      await authTester.testNonRecordOwnerCannotAccessWithDefaultOwnerField();
    });

    test('custom owner field used to store owner information', async () => {
      await authTester.testStoreOwnerInCustomField();
    });

    test('non-owner of a record cannot pretend to be an owner and gain access', async () => {
      await authTester.testNonOwnerCannotPretendToBeOwner();
    });

    test('member in list of owners can perform CRUD and subscription operations', async () => {
      await authTester.testListOwnersMemberCrudOperations();
    });

    test('non-owner of a record cannot add themself to owner list', async () => {
      await authTester.testNonOwnerCannotAddThemselvesToList();
    });

    test('owner can add another user to the owner list', async () => {
      await authTester.testOwnerCanAddAnotherUserToList();
    });

    test('users in static group can perform CRUD and subscription operations', async () => {
      await authTester.testStaticGroupUserCrudOperations();
    });

    test('users not in static group cannot perform CRUD operations', async () => {
      await authTester.testNonStaticGroupUserCrudOperations();
    });

    test('users in group stored as string can perform CRUD and subscription operations', async () => {
      await authTester.testGroupUserCrudOperations();
    });

    test('users cannot spoof their group membership and gain access', async () => {
      await authTester.testUsersCannotSpoofGroupMembership();
    });

    test('users in groups stored as list can perform CRUD and subscription operations', async () => {
      await authTester.testListGroupUserCrudOperations();
    });

    test('users not part of allowed groups cannot access the records or modify allowed groups', async () => {
      await authTester.testNotAllowedGroupUserCannotAccess();
    });

    test('Admin user can give access to another group of users', async () => {
      await authTester.testAdminUserCanGiveAccessToAnotherUserGroup();
    });

    test('logged in user can perform custom operations', async () => {
      await authTester.testLoggedInUserCustomOperations();
    });

    test('users in static group can perform custom operations', async () => {
      await authTester.testStaticGroupUserCustomOperations();
    });

    test('users not in static group cannot perform custom operations', async () => {
      await authTester.testNonStaticGroupUserCustomOperations();
    });
  });
};
