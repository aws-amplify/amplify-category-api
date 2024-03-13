import {
  addApi,
  amplifyPush,
  createNewProjectDir,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  importRDSDatabase,
  initJSProjectWithProfile,
  setupRDSInstanceAndData,
  sleep,
  updateAuthAddUserGroups,
  getProjectMeta,
} from 'amplify-category-api-e2e-core';
import { existsSync, writeFileSync, removeSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import { schema, sqlCreateStatements } from '../__tests__/auth-test-schemas/userpool-provider-fields';
import {
  createModelOperationHelpers,
  configureAppSyncClients,
  checkOperationResult,
  checkListItemExistence,
  appendAmplifyInput,
  getAppSyncEndpoint,
  getDefaultDatabasePort,
  checkListResponseErrors,
  expectNullFields,
  expectedFieldErrors,
  expectedOperationError,
} from '../rds-v2-test-utils';
import { setupUser, getUserPoolId, signInUser, configureAmplify, getConfiguredAppsyncClientCognitoAuth } from '../schema-api-directives';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';
import { GQLQueryHelper } from '../query-utils/gql-helper';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

export const testUserPoolFieldAuth = (engine: ImportedRDSType): void => {
  describe('SQL Cognito userpool provider Auth tests', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'us-east-1';
    let port = getDefaultDatabasePort(engine);
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const projName = 'fielduserpool';
    const userName1 = 'user1';
    const userName2 = 'user2';
    const adminGroupName = 'Admin';
    const devGroupName = 'Dev';
    const userPassword = 'user@Password';
    const userPoolProvider = 'userPools';
    const apiKeyProvider = 'apiKey';
    let graphQlEndpoint = 'localhost';

    let projRoot;
    let user1ModelOperationHelpers: { [key: string]: GQLQueryHelper };
    let user2ModelOperationHelpers: { [key: string]: GQLQueryHelper };
    const userMap = {};

    beforeAll(async () => {
      console.log(sqlCreateStatements(engine));
      projRoot = await createNewProjectDir(projName);
      await setupAmplifyProject();
    });

    afterAll(async () => {
      const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
      if (existsSync(metaFilePath)) {
        await deleteProject(projRoot);
      }
      deleteProjectDir(projRoot);
      await cleanupDatabase();
    });

    const setupDatabase = async (): Promise<void> => {
      const dbConfig = {
        identifier,
        engine,
        dbname: database,
        username,
        password,
        region,
        port,
      };

      const db = await setupRDSInstanceAndData(dbConfig, sqlCreateStatements(engine));
      port = db.port;
      host = db.endpoint;
    };

    const cleanupDatabase = async (): Promise<void> => {
      await deleteDBInstance(identifier, region);
    };

    const setupAmplifyProject = async (): Promise<void> => {
      const apiName = projName;
      await initJSProjectWithProfile(projRoot, {
        disableAmplifyAppCreation: false,
        name: projName,
      });

      const metaAfterInit = getProjectMeta(projRoot);
      region = metaAfterInit.providers.awscloudformation.Region;

      await addApi(projRoot, {
        transformerVersion: 2,
        'Amazon Cognito User Pool': {},
        'API key': {},
      });
      const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
      const ddbSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.graphql');
      removeSync(ddbSchemaFilePath);

      await setupDatabase();
      await importRDSDatabase(projRoot, {
        database,
        engine,
        host,
        port,
        username,
        password,
        useVpc: true,
        apiExists: true,
      });

      writeFileSync(rdsSchemaFilePath, appendAmplifyInput(schema, engine), 'utf8');

      await updateAuthAddUserGroups(projRoot, [adminGroupName, devGroupName]);
      await amplifyPush(projRoot, false, {
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });
      await sleep(30 * 1000); // Wait for 30 seconds for the VPC endpoints to be live.

      const userPoolId = getUserPoolId(projRoot);
      configureAmplify(projRoot);
      await setupUser(userPoolId, userName1, userPassword, adminGroupName);
      await setupUser(userPoolId, userName2, userPassword, devGroupName);
      graphQlEndpoint = getAppSyncEndpoint(projRoot, apiName);
      const user1 = await signInUser(userName1, userPassword);
      userMap[userName1] = user1;
      const user2 = await signInUser(userName2, userPassword);
      userMap[userName2] = user2;
      const appSyncClients = await configureAppSyncClients(projRoot, apiName, [userPoolProvider, apiKeyProvider], userMap);
      user1ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      user2ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
    };

    test('Private model auth and allowed field operations', async () => {
      const modelName = 'TodoPrivateContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        privateContent: 'Private Content',
        ownerContent: 'Owner Content',
        adminContent: 'Admin Content',
        groupContent: 'Group Content',
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const user1CreateAllowedSet = `
        id
        owner
        authors
        customGroup
        customGroups
        privateContent
        ownerContent
        adminContent
        groupContent
      `;

      // owner(user1) creates a record with only allowed fields
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, user1CreateAllowedSet);
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['id'] = createResult1.data[createResultSetName].id;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      expectNullFields(createResult1.data[createResultSetName], [
        'customGroup',
        'customGroups',
        'privateContent',
        'ownerContent',
        'adminContent',
        'groupContent',
      ]);

      // user1 can update the allowed fields and add user2 to dyamic owners list field
      const todoUpdated1 = {
        id: todo['id'],
        authors: [userName1, userName2],
        customGroups: [adminGroupName, devGroupName],
        privateContent: 'Private Content updated',
        ownersContent: 'Owners Content updated',
        adminContent: 'Admin Content updated',
        groupsContent: 'Groups Content updated',
      };
      const user1UpdateAllowedSet = `
        id
        owner
        authors
        customGroup
        customGroups
        privateContent
        ownersContent
        adminContent
        groupsContent
      `;
      const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, user1UpdateAllowedSet);
      expect(updateResult1.data[updateResultSetName].id).toEqual(todo['id']);
      expect(updateResult1.data[updateResultSetName].owner).toEqual(userName1);
      expect(updateResult1.data[updateResultSetName].authors).toEqual([userName1, userName2]);
      expectNullFields(updateResult1.data[updateResultSetName], [
        'customGroup',
        'customGroups',
        'privateContent',
        'ownersContent',
        'adminContent',
        'groupsContent',
      ]);

      // user1 can read the allowed fields
      const completeResultSet = `
        id
        owner
        authors
        customGroup
        customGroups
        privateContent
        ownerContent
        ownersContent
        adminContent
        groupContent
        groupsContent
      `;
      const user1ReadAllowedSet = completeResultSet;
      const getResult1 = await user1TodoHelper.get(
        {
          id: todo['id'],
        },
        user1ReadAllowedSet,
        false,
      );
      checkOperationResult(getResult1, { ...todo, ...todoUpdated1 }, `get${modelName}`);

      const listTodosResult1 = await user1TodoHelper.list({}, user1ReadAllowedSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['id'], true);

      // user2 can update the private and dynamic owners list protected fields.
      const todoUpdated2 = {
        id: todo['id'],
        owner: todo['owner'],
        authors: [userName2],
        customGroup: devGroupName,
        customGroups: [devGroupName],
        privateContent: 'Private Content updated 1',
        ownersContent: 'Owners Content updated 1',
        groupsContent: 'Groups Content updated 1',
      };
      const user2UpdateAllowedSet = `
        id
        owner
        authors
        customGroup
        customGroups
        privateContent
        ownersContent
        groupsContent
      `;
      const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, user2UpdateAllowedSet);
      expect(updateResult2.data[updateResultSetName].id).toEqual(todo['id']);
      expect(updateResult2.data[updateResultSetName].owner).toEqual(userName1);
      expect(updateResult2.data[updateResultSetName].authors).toEqual([userName2]);
      expectNullFields(updateResult2.data[updateResultSetName], [
        'customGroup',
        'customGroups',
        'privateContent',
        'ownersContent',
        'groupsContent',
      ]);

      // user2 can read the allowed fields
      const user2ReadAllowedSet = user2UpdateAllowedSet;
      const getResult2 = await user2TodoHelper.get(
        {
          id: todo['id'],
        },
        user2ReadAllowedSet,
        false,
      );
      checkOperationResult(getResult2, todoUpdated2, `get${modelName}`);

      const listTodosResult2 = await user2TodoHelper.list({}, user2ReadAllowedSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['id'], true);

      // unless one has delete access to all fields in the model, delete is expected to fail
      await expect(
        async () => await user1TodoHelper.delete(`delete${modelName}`, { id: todo['id'] }, user1CreateAllowedSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(`delete${modelName}`, 'Mutation'));

      // user2 can listen to updates on the non-protected fields
      const todoRandom = {
        ...todo,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoUpdated1,
        id: todoRandom.id,
        owner: userName1,
        privateContent: 'Private Content updated',
        adminContent: 'Admin Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await user1TodoHelper.create(createResultSetName, todoRandom, user1CreateAllowedSet);
          },
        ],
        {},
        user1CreateAllowedSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], [
        'customGroup',
        'customGroups',
        'privateContent',
        'ownerContent',
        'adminContent',
        'groupContent',
      ]);

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, user1UpdateAllowedSet);
          },
        ],
        {},
        user1UpdateAllowedSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], [
        'customGroup',
        'customGroups',
        'privateContent',
        'ownersContent',
        'adminContent',
        'groupsContent',
      ]);

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, user1UpdateAllowedSet, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('Private model auth and restricted field operations', async () => {
      const modelName = 'TodoPrivateContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todoPrivateFields = {
        owner: userName1,
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        privateContent: 'Private Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const privateResultSet = `
        id
        owner
        authors
        customGroup
        customGroups
        privateContent
      `;

      // cannot create a record with public protected field
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todoPrivateFields, publicContent: 'Public Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // cannot create a record with dynamic owner list protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todoPrivateFields, ownersContent: 'Owners Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // cannot create a record with dynamic groups list protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todoPrivateFields, groupsContent: 'Groups Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // Create a record with allowed fields, so we can test the update and delete operations.
      const user1CreateAllowedSet = `
        ${privateResultSet}
        ownerContent
        adminContent
        groupContent
      `;
      const createResult1 = await user1TodoHelper.create(
        createResultSetName,
        { ...todoPrivateFields, ownerContent: 'Owner Content', adminContent: 'Admin Content', groupContent: 'Group Content' },
        user1CreateAllowedSet,
      );
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todoPrivateFields['id'] = createResult1.data[createResultSetName].id;
      // protected fields are nullified in mutation responses
      const nulledPrivateFields = ['customGroup', 'customGroups', 'privateContent'];
      expectNullFields(createResult1.data[createResultSetName], [...nulledPrivateFields, 'ownerContent', 'adminContent', 'groupContent']);

      const privateAndPublicSet = `
        ${privateResultSet}
        publicContent
      `;
      // cannot update a record with public protected field
      await expect(
        async () =>
          await user1TodoHelper.update(updateResultSetName, { ...todoPrivateFields, publicContent: 'Public Content' }, privateAndPublicSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      const privateAndOwnerSet = `
        ${privateResultSet}
        ownerContent
      `;
      // cannot update a record with owner protected field that does not allow update operation
      await expect(
        async () =>
          await user1TodoHelper.update(updateResultSetName, { ...todoPrivateFields, ownerContent: 'Owner Content' }, privateAndOwnerSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      const privateAndOwnersSet = `
        ${privateResultSet}
        ownersContent
      `;
      // non-owner cannot update a record with dynamic owner list protected field
      await expect(
        async () =>
          await user2TodoHelper.update(updateResultSetName, { ...todoPrivateFields, ownersContent: 'Owners Content' }, privateAndOwnersSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      const privateAndGroupSet = `
          ${privateResultSet}
          groupContent
        `;
      // cannot update a record with group protected field that does not allow update operation
      await expect(
        async () =>
          await user1TodoHelper.update(updateResultSetName, { ...todoPrivateFields, groupContent: 'Group Content' }, privateAndGroupSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      const privateAndGroupsSet = `
        ${privateResultSet}
        groupsContent
      `;
      // non-owner cannot update a record with dynamic group list protected field
      await expect(
        async () =>
          await user2TodoHelper.update(updateResultSetName, { ...todoPrivateFields, groupsContent: 'Groups Content' }, privateAndGroupsSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // cannot read a record with public protected field
      const getResult1 = await user1TodoHelper.get({ id: todoPrivateFields['id'] }, privateAndPublicSet, false, 'all');
      checkOperationResult(
        getResult1,
        { ...todoPrivateFields, publicContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(['publicContent'], modelName),
      );

      const listTodosResult1 = await user1TodoHelper.list({}, privateAndPublicSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todoPrivateFields['id'], true);
      checkListResponseErrors(listTodosResult1, expectedFieldErrors(['publicContent'], modelName, false));

      // non-owner or user not part of allowed groups cannot read owner, group protected fields
      const ownerAndGroupFields = ['ownerContent', 'ownersContent', 'adminContent', 'groupContent', 'groupsContent'];
      const nonPublicSet = `
        ${privateResultSet}
        ${ownerAndGroupFields.join('\n')}
      `;
      const getResult2 = await user2TodoHelper.get({ id: todoPrivateFields['id'] }, nonPublicSet, false, 'all');
      checkOperationResult(
        getResult2,
        { ...todoPrivateFields, ownerContent: null, ownersContent: null, adminContent: null, groupContent: null, groupsContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(ownerAndGroupFields, modelName),
      );

      const listTodosResult2 = await user2TodoHelper.list({}, nonPublicSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todoPrivateFields['id'], true);
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(ownerAndGroupFields, modelName, false));
    });

    test('Owner model auth and allowed field operations', async () => {
      const modelName = 'TodoOwnerContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        privateContent: 'Private Content',
        ownersContent: 'Owners Content',
        adminContent: 'Admin Content',
        groupsContent: 'Groups Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const privateResultSet = `
        id
        privateContent
      `;
      const ownerResultSet = `
        ${privateResultSet}
        owner
        authors
        customGroup
        customGroups
      `;
      const adminOwnerResultSet = `
          ${ownerResultSet}
          adminContent
        `;
      const setWithOwnerAndGroupContent = `
          ${adminOwnerResultSet}
          ownerContent
          groupContent
        `;
      const setWithOwnersAndGroupsContent = `
          ${adminOwnerResultSet}
          ownersContent
          groupsContent
        `;
      const completeResultSet = `
          ${adminOwnerResultSet}
          ownerContent
          ownersContent
          groupContent
          groupsContent
        `;

      // owner(user1) creates a record with only allowed fields
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, setWithOwnersAndGroupsContent);
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['id'] = createResult1.data[createResultSetName].id;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      const nulledOwnerFields = ['customGroup', 'customGroups', 'privateContent'];
      expectNullFields(createResult1.data[createResultSetName], [...nulledOwnerFields, 'ownersContent', 'groupsContent']);

      // user1 can update the allowed fields and add user2 to dyamic owners list field
      const todoUpdated1 = {
        id: todo['id'],
        authors: [userName1, userName2],
        customGroups: [adminGroupName, devGroupName],
        privateContent: 'Private Content updated',
        ownerContent: 'Owner Content',
        adminContent: 'Admin Content updated',
        groupContent: 'Group Content',
      };
      const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, setWithOwnerAndGroupContent);
      expect(updateResult1.data[updateResultSetName].id).toEqual(todo['id']);
      expect(updateResult1.data[updateResultSetName].owner).toEqual(userName1);
      expect(updateResult1.data[updateResultSetName].authors).toEqual([userName1, userName2]);
      expectNullFields(updateResult1.data[updateResultSetName], [...nulledOwnerFields, 'ownerContent', 'groupContent']);

      // user1 can read the allowed fields
      const getResult1 = await user1TodoHelper.get(
        {
          id: todo['id'],
        },
        completeResultSet,
        false,
      );
      checkOperationResult(getResult1, { ...todo, ...todoUpdated1 }, `get${modelName}`);

      const listTodosResult1 = await user1TodoHelper.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['id'], true);

      // unless one has delete access to all fields in the model, delete is expected to fail
      await expect(
        async () => await user1TodoHelper.delete(`delete${modelName}`, { id: todo['id'] }, privateResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(`delete${modelName}`, 'Mutation'));

      // user2 can update the private field
      const todoUpdated2 = {
        id: todo['id'],
        privateContent: 'Private Content updated 1',
      };
      const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, privateResultSet);
      expect(updateResult2.data[updateResultSetName].id).toEqual(todo['id']);
      expectNullFields(updateResult2.data[updateResultSetName], ['privateContent']);

      // user2 can read the allowed fields
      const user2ReadAllowedSet = `
        id
        privateContent
        ownersContent
        groupsContent
      `;
      const getResult2 = await user2TodoHelper.get(
        {
          id: todo['id'],
        },
        user2ReadAllowedSet,
        false,
      );
      checkOperationResult(
        getResult2,
        {
          id: todo['id'],
          privateContent: todoUpdated2['privateContent'],
          ownersContent: todo['ownersContent'],
          groupsContent: todo['groupsContent'],
        },
        `get${modelName}`,
      );

      const listTodosResult2 = await user2TodoHelper.list({}, user2ReadAllowedSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['id'], true);

      // owner can listen to updates on allowed fields
      const todoRandom = {
        ...todo,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoUpdated1,
        id: todoRandom.id,
        owner: userName1,
        privateContent: 'Private Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await user1TodoHelper.create(createResultSetName, todoRandom, setWithOwnersAndGroupsContent);
          },
        ],
        {},
        setWithOwnersAndGroupsContent,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        {
          ...todoRandom,
          customGroup: null,
          customGroups: null,
          privateContent: null,
          adminContent: null,
          ownersContent: null,
          groupsContent: null,
        },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, setWithOwnerAndGroupContent);
          },
        ],
        {},
        setWithOwnerAndGroupContent,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        {
          ...todoRandomUpdated,
          customGroup: null,
          customGroups: null,
          privateContent: null,
          adminContent: null,
          ownerContent: null,
          groupContent: null,
        },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, setWithOwnersAndGroupsContent, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('Owner model auth with restricted field operations', async () => {
      const modelName = 'TodoOwnerContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        privateContent: 'Private Content',
        ownersContent: 'Owners Content',
        adminContent: 'Admin Content',
        groupsContent: 'Groups Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const privateResultSet = `
        id
        privateContent
      `;
      const ownerResultSet = `
        ${privateResultSet}
        owner
        authors
        customGroup
        customGroups
      `;
      const adminOwnerResultSet = `
          ${ownerResultSet}
          adminContent
        `;
      const setWithOwnerAndGroupContent = `
          ${adminOwnerResultSet}
          ownerContent
          groupContent
        `;
      const setWithOwnersAndGroupsContent = `
          ${adminOwnerResultSet}
          ownersContent
          groupsContent
        `;
      const completeResultSet = `
          ${adminOwnerResultSet}
          ownerContent
          ownersContent
          groupContent
          groupsContent
        `;

      // user1 cannot create a record by specifying user2 as the owner
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, owner: 'user2' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // user cannot create a record with public protected field
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, publicContent: 'Public Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // user cannot create a record with a owner protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, ownerContent: 'Owner Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // user cannot create a record with a group protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, groupContent: 'Group Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // Create a record with allowed fields, so we can test the update and delete operations.
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, setWithOwnersAndGroupsContent);
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['id'] = createResult1.data[createResultSetName].id;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      const nulledOwnerFields = ['customGroup', 'customGroups', 'privateContent'];
      expectNullFields(createResult1.data[createResultSetName], [...nulledOwnerFields, 'ownersContent']);

      const publicFieldSet = `
        id
        publicContent
      `;
      // owner cannot update a record with public protected field
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { id: todo['id'], publicContent: 'Public Content' }, publicFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // owner cannot update a record with dynamic list of owners protected field that does not allow update operation
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { ...todo, ownersContent: 'Owners Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // owner cannot update a record with dynamic list of groups protected field that does not allow update operation
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { ...todo, groupsContent: 'Groups Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner cannot update a record to re-assign ownership
      const ownerFieldSet = `
        id
        owner
      `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { id: todo['id'], owner: 'user2' }, ownerFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner cannot update a record to re-assign owners in dynamic owners list
      const ownersFieldSet = `
        id
        authors
      `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { id: todo['id'], authors: ['user2'] }, ownersFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner cannot update a record to re-assign group membership
      const groupFieldSet = `
          id
          customGroup
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { id: todo['id'], customGroup: devGroupName }, groupFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner cannot update a record to re-assign group memberships stored as dynamic list
      const groupsFieldSet = `
          id
          customGroups
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { id: todo['id'], customGroups: [devGroupName] }, groupsFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner cannot update a record with an owner protected field
      const ownerContentFieldSet = `
        id
        ownerContent
      `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { ...todo, ownerContent: 'Owner Content' }, ownerContentFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-member of group cannot update a record with a group protected field
      const groupContentFieldSet = `
          id
          groupContent
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { ...todo, groupContent: 'Group Content' }, groupContentFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // owner cannot read a record with public protected field
      const getResult1 = await user1TodoHelper.get({ id: todo['id'] }, publicFieldSet, false, 'all');
      checkOperationResult(
        getResult1,
        { id: todo['id'], publicContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(['publicContent'], modelName),
      );

      const listTodosResult1 = await user1TodoHelper.list({}, publicFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult1, expectedFieldErrors(['publicContent'], modelName, false));

      // non-owner cannot read a record with owner and group protected fields in the selection set
      const ownerReadFieldSet = `
        id
        owner
        authors
        customGroup
        customGroups
        ownerContent
        ownersContent
        adminContent
        groupContent
        groupsContent
      `;
      const getResult2 = await user2TodoHelper.get({ id: todo['id'] }, ownerReadFieldSet, false, 'all');
      const expectedReadErrorFields = [
        'owner',
        'authors',
        'ownerContent',
        'ownersContent',
        'adminContent',
        'groupContent',
        'groupsContent',
      ];
      checkOperationResult(
        getResult2,
        {
          id: todo['id'],
          owner: null,
          authors: null,
          customGroup: null,
          customGroups: null,
          ownerContent: null,
          ownersContent: null,
          adminContent: null,
          groupContent: null,
          groupsContent: null,
        },
        `get${modelName}`,
        false,
        expectedFieldErrors(expectedReadErrorFields, modelName),
      );

      const listTodosResult2 = await user2TodoHelper.list({}, ownerReadFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(expectedReadErrorFields, modelName, false));

      // non-owner cannot listen to updates on owner protected fields
      const todoRandom = {
        ...todo,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        id: todoRandom.id,
        owner: userName1,
        privateContent: 'Private Content updated',
        ownerContent: 'Owner Content updated',
        groupContent: 'Group Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await user1TodoHelper.create(createResultSetName, todoRandom, setWithOwnersAndGroupsContent);
        },
      ]);
      const expectedSubscriptionNullFields = [
        'ownerContent',
        'ownersContent',
        'adminContent',
        'groupContent',
        'groupsContent',
        'privateContent',
        'publicContent',
      ];
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].id).toEqual(todoRandom.id);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].owner).toEqual(userName1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].authors).toEqual(todoRandom.authors);
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], expectedSubscriptionNullFields);

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, setWithOwnerAndGroupContent);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].id).toEqual(todoRandom.id);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].owner).toEqual(userName1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].authors).toEqual(todoRandom.authors);
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], expectedSubscriptionNullFields);

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', []);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('Custom owner model auth and allowed field operations', async () => {
      const modelName = 'TodoCustomOwnerContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        customId: Date.now().toString(),
        author: userName1,
        privateContent: 'Private Content',
        ownerContent: 'Owner Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const deleteResultSetName = `delete${modelName}`;
      const privateResultSet = `
        customId
        privateContent
      `;
      const ownerResultSet = `
        ${privateResultSet}
        author
      `;
      const completeOwnerResultSet = `
        ${ownerResultSet}
        ownerContent
      `;

      // owner(user1) creates a record with only allowed fields
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, completeOwnerResultSet);
      checkOperationResult(createResult1, { ...todo, privateContent: null, ownerContent: null }, createResultSetName);

      // user1 can update the allowed fields
      const todoUpdated1 = {
        customId: todo['customId'],
        author: userName1,
        privateContent: 'Private Content updated',
      };
      const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, completeOwnerResultSet);
      checkOperationResult(updateResult1, { ...todo, ...todoUpdated1, privateContent: null, ownerContent: null }, updateResultSetName);

      // user1 can read the allowed fields
      const getResult1 = await user1TodoHelper.get(
        {
          customId: todo['customId'],
        },
        completeOwnerResultSet,
        false,
        'all',
        'customId',
      );
      checkOperationResult(getResult1, { ...todo, ...todoUpdated1 }, `get${modelName}`);

      const listTodosResult1 = await user1TodoHelper.list({}, completeOwnerResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['customId'], true, 'customId');

      // user2 can update the private field
      const todoUpdated2 = {
        customId: todo['customId'],
        privateContent: 'Private Content updated 1',
      };
      const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, privateResultSet);
      expect(updateResult2.data[updateResultSetName].customId).toEqual(todo['customId']);
      expectNullFields(updateResult2.data[updateResultSetName], ['privateContent']);

      // user2 can read the allowed fields
      const getResult2 = await user2TodoHelper.get(
        {
          customId: todo['customId'],
        },
        privateResultSet,
        false,
        'all',
        'customId',
      );
      checkOperationResult(
        getResult2,
        {
          customId: todo['customId'],
          privateContent: todoUpdated2['privateContent'],
        },
        `get${modelName}`,
      );

      const listTodosResult2 = await user2TodoHelper.list({}, privateResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');

      // user1 can delete the record
      const deleteResult1 = await user1TodoHelper.delete(deleteResultSetName, { customId: todo['customId'] }, completeOwnerResultSet);
      checkOperationResult(deleteResult1, { ...todo, ...todoUpdated1, privateContent: null, ownerContent: null }, deleteResultSetName);

      // owner(user1) can listen to updates on allowed fields
      const todoRandom = {
        ...todo,
        customId: Date.now().toString(),
      };
      const todoRandomUpdated = {
        customId: todoRandom.customId,
        author: userName1,
        privateContent: 'Private Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await user1TodoHelper.create(createResultSetName, todoRandom, completeOwnerResultSet);
          },
        ],
        {},
        completeOwnerResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, privateContent: null, ownerContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(updateResultSetName, todoRandomUpdated, completeOwnerResultSet);
          },
        ],
        {},
        completeOwnerResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, privateContent: null, ownerContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe(
        'onDelete',
        [
          async () => {
            await user1TodoHelper.delete(deleteResultSetName, { customId: todoRandom.customId }, completeOwnerResultSet);
          },
        ],
        {},
        completeOwnerResultSet,
        false,
      );
      expect(onDeleteSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onDeleteSubscriptionResult[0],
        { ...todoRandomUpdated, privateContent: null, ownerContent: null },
        `onDelete${modelName}`,
      );
    });

    test('Custom owner model auth and restricted field operations', async () => {
      const modelName = 'TodoCustomOwnerContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        customId: Date.now().toString(),
        author: userName1,
        privateContent: 'Private Content',
        ownerContent: 'Owner Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const deleteResultSetName = `delete${modelName}`;
      const privateResultSet = `
        customId
        privateContent
      `;
      const ownerResultSet = `
        ${privateResultSet}
        author
      `;
      const completeOwnerResultSet = `
        ${ownerResultSet}
        ownerContent
      `;

      // user1 cannot create a record by specifying user2 as the owner
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, author: 'user2' }, completeOwnerResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // user cannot create a record with public protected field
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, publicContent: 'Public Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // Create a record with allowed fields, so we can test the update and delete operations.
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, completeOwnerResultSet);
      checkOperationResult(createResult1, { ...todo, privateContent: null, ownerContent: null }, createResultSetName);

      const publicFieldSet = `
        customId
        publicContent
      `;
      // owner cannot update a record with public protected field
      await expect(
        async () =>
          await user1TodoHelper.update(
            updateResultSetName,
            { customId: todo['customId'], publicContent: 'Public Content' },
            publicFieldSet,
          ),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // owner cannot update a record with a protected field that does not allow update operation
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { ...todo, ownerContent: 'Owner Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner cannot update a record to re-assign ownership
      const ownerFieldSet = `
        customId
        author
      `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { customId: todo['customId'], author: 'user2' }, ownerFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner cannot update a record with an owner protected field
      const ownerContentFieldSet = `
        customId
        ownerContent
      `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { ...todo, ownerContent: 'Owner Content' }, ownerContentFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // owner cannot read a record with public protected field
      const getResult1 = await user1TodoHelper.get({ customId: todo['customId'] }, publicFieldSet, false, 'all', 'customId');
      checkOperationResult(
        getResult1,
        { customId: todo['customId'], publicContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(['publicContent'], modelName),
      );

      const listTodosResult1 = await user1TodoHelper.list({}, publicFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['customId'], true, 'customId');
      checkListResponseErrors(listTodosResult1, expectedFieldErrors(['publicContent'], modelName, false));

      // non-owner cannot read a record with owner protected fields in the selection set
      const ownerReadFieldSet = `
        customId
        author
        ownerContent
      `;
      const getResult2 = await user2TodoHelper.get({ customId: todo['customId'] }, ownerReadFieldSet, false, 'all', 'customId');
      checkOperationResult(
        getResult2,
        { customId: todo['customId'], author: null, ownerContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(['author', 'ownerContent'], modelName),
      );

      const listTodosResult2 = await user2TodoHelper.list({}, ownerReadFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(['author', 'ownerContent'], modelName, false));

      // non-owner cannot listen to updates on owner protected fields
      const todoRandom = {
        ...todo,
        customId: Date.now().toString(),
      };
      const todoRandomUpdated = {
        customId: todoRandom.customId,
        author: userName1,
        privateContent: 'Private Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await user1TodoHelper.create(createResultSetName, todoRandom, completeOwnerResultSet);
          },
        ],
        {},
        completeOwnerResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].customId).toEqual(todoRandom.customId);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].author).toEqual(todoRandom.author);
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], ['privateContent', 'ownerContent']);

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(updateResultSetName, todoRandomUpdated, completeOwnerResultSet);
          },
        ],
        {},
        completeOwnerResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].customId).toEqual(todoRandom.customId);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].author).toEqual(todoRandom.author);
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], ['privateContent', 'ownerContent']);

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [
        async () => {
          await user1TodoHelper.delete(deleteResultSetName, { customId: todoRandom['customId'] }, completeOwnerResultSet);
        },
      ]);
      expect(onDeleteSubscriptionResult).toHaveLength(1);
      expect(onDeleteSubscriptionResult[0].data[`onDelete${modelName}`].customId).toEqual(todoRandom.customId);
      expect(onDeleteSubscriptionResult[0].data[`onDelete${modelName}`].author).toEqual(todoRandom.author);
      expectNullFields(onDeleteSubscriptionResult[0].data[`onDelete${modelName}`], ['privateContent', 'publicContent', 'ownerContent']);
    });

    test('Custom list of owners model auth and allowed field operations', async () => {
      const modelName = 'TodoCustomOwnersContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        customId: Date.now().toString(),
        authors: [userName1],
        privateContent: 'Private Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const deleteResultSetName = `delete${modelName}`;
      const privateResultSet = `
        customId
        privateContent
      `;
      const ownerResultSet = `
        ${privateResultSet}
        authors
      `;
      const completeOwnerResultSet = `
        ${ownerResultSet}
        ownersContent
      `;

      // owner(user1) creates a record with only allowed fields
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, completeOwnerResultSet);
      checkOperationResult(createResult1, { ...todo, privateContent: null, ownersContent: null }, createResultSetName);

      // user1 can update the allowed fields
      const todoUpdated1 = {
        customId: todo['customId'],
        authors: [userName1, userName2],
        privateContent: 'Private Content updated',
        ownersContent: 'Owners Content',
      };
      const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, completeOwnerResultSet);
      checkOperationResult(updateResult1, { ...todo, ...todoUpdated1, privateContent: null, ownersContent: null }, updateResultSetName);

      // user1 can read the allowed fields
      const getResult1 = await user1TodoHelper.get(
        {
          customId: todo['customId'],
        },
        completeOwnerResultSet,
        false,
        'all',
        'customId',
      );
      checkOperationResult(getResult1, { ...todo, ...todoUpdated1 }, `get${modelName}`);

      const listTodosResult1 = await user1TodoHelper.list({}, completeOwnerResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['customId'], true, 'customId');

      // user2 can update the dynamic owners protected field
      const todoUpdated2 = {
        customId: todo['customId'],
        ownersContent: 'Owners Content Updated',
      };
      const user2UpdateSet = `
        customId
        ownersContent
      `;
      const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, user2UpdateSet);
      expect(updateResult2.data[updateResultSetName].customId).toEqual(todo['customId']);
      expectNullFields(updateResult2.data[updateResultSetName], ['ownersContent']);

      // user2 can update the private field
      const todoUpdated3 = {
        customId: todo['customId'],
        privateContent: 'Private Content updated 1',
      };
      const updateResult3 = await user2TodoHelper.update(updateResultSetName, todoUpdated3, privateResultSet);
      expect(updateResult3.data[updateResultSetName].customId).toEqual(todo['customId']);
      expectNullFields(updateResult3.data[updateResultSetName], ['privateContent']);

      // user2 can read the allowed fields
      const getResult2 = await user2TodoHelper.get(
        {
          customId: todo['customId'],
        },
        privateResultSet,
        false,
        'all',
        'customId',
      );
      checkOperationResult(
        getResult2,
        {
          customId: todo['customId'],
          privateContent: todoUpdated3['privateContent'],
        },
        `get${modelName}`,
      );

      const listTodosResult2 = await user2TodoHelper.list({}, privateResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');

      // owner(user1) can listen to updates on allowed fields
      const todoRandom = {
        ...todo,
        customId: Date.now().toString(),
      };
      const todoRandomUpdated = {
        customId: todoRandom.customId,
        authors: [userName1],
        privateContent: 'Private Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await user1TodoHelper.create(createResultSetName, todoRandom, completeOwnerResultSet);
          },
        ],
        {},
        completeOwnerResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, privateContent: null, ownersContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(updateResultSetName, todoRandomUpdated, completeOwnerResultSet);
          },
        ],
        {},
        completeOwnerResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, privateContent: null, ownersContent: null },
        `onUpdate${modelName}`,
      );
    });

    test('Custom list of owners model auth and restricted field operations', async () => {
      const modelName = 'TodoCustomOwnersContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        customId: Date.now().toString(),
        privateContent: 'Private Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const deleteResultSetName = `delete${modelName}`;
      const privateResultSet = `
        customId
        privateContent
      `;
      const ownerResultSet = `
        ${privateResultSet}
        authors
      `;
      const completeOwnerResultSet = `
        ${ownerResultSet}
        ownersContent
      `;

      // user1 cannot create a record by specifying user2 as the only owner
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, authors: [userName2] }, completeOwnerResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // user cannot create a record with dynamic owner list protected field that does not allow create operation
      await expect(
        async () =>
          await user1TodoHelper.create(
            createResultSetName,
            { ...todo, authors: [userName1], ownersContent: 'Owners Content' },
            completeOwnerResultSet,
          ),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // user cannot create a record with public protected field
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, publicContent: 'Public Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // Create a record with non-public fields which is allowed, so we can test the update and delete operations.
      const createResult = await user1TodoHelper.create(createResultSetName, { ...todo, authors: [userName1] }, ownerResultSet);
      checkOperationResult(createResult, { ...todo, authors: [userName1], privateContent: null }, createResultSetName);
      todo['authors'] = [userName1];

      const publicFieldSet = `
        customId
        publicContent
      `;
      // owner cannot update a record with public protected field
      await expect(
        async () =>
          await user1TodoHelper.update(
            updateResultSetName,
            { customId: todo['customId'], publicContent: 'Public Content' },
            publicFieldSet,
          ),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner cannot update a record to re-assign ownership
      const ownerFieldSet = `
        customId
        authors
      `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { customId: todo['customId'], authors: ['user2'] }, ownerFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner cannot update a record with a dynamic owner list protected field
      const ownersContentFieldSet = `
        customId
        ownersContent
      `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { ...todo, ownersContent: 'Owners Content' }, ownersContentFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // owner cannot read a record with public protected field
      const getResult1 = await user1TodoHelper.get({ customId: todo['customId'] }, publicFieldSet, false, 'all', 'customId');
      checkOperationResult(
        getResult1,
        { customId: todo['customId'], publicContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(['publicContent'], modelName),
      );

      const listTodosResult1 = await user1TodoHelper.list({}, publicFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['customId'], true, 'customId');
      checkListResponseErrors(listTodosResult1, expectedFieldErrors(['publicContent'], modelName, false));

      // non-owner cannot read a record with dynamic owner list protected field in the selection set
      const ownerReadFieldSet = `
        customId
        authors
        ownersContent
      `;
      const getResult2 = await user2TodoHelper.get({ customId: todo['customId'] }, ownerReadFieldSet, false, 'all', 'customId');
      checkOperationResult(
        getResult2,
        { customId: todo['customId'], authors: null, ownersContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(['authors', 'ownersContent'], modelName),
      );

      const listTodosResult2 = await user2TodoHelper.list({}, ownerReadFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(['authors', 'ownersContent'], modelName, false));

      // non-owner cannot listen to updates on owner protected fields
      const todoRandom = {
        ...todo,
        customId: Date.now().toString(),
      };
      const todoRandomUpdated = {
        customId: todoRandom.customId,
        authors: [userName1],
        privateContent: 'Private Content updated',
        ownersContent: 'Owners Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await user1TodoHelper.create(createResultSetName, todoRandom, completeOwnerResultSet);
          },
        ],
        {},
        completeOwnerResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].customId).toEqual(todoRandom.customId);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].authors).toEqual([userName1]);
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], ['privateContent', 'ownersContent']);

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(updateResultSetName, todoRandomUpdated, completeOwnerResultSet);
          },
        ],
        {},
        completeOwnerResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].customId).toEqual(todoRandom.customId);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].authors).toEqual([userName1]);
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], ['privateContent', 'ownersContent']);
    });

    test('admin group protected model and allowed field operations', async () => {
      const modelName = 'TodoAdminContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        owner: userName1,
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        privateContent: 'Private Content',
        ownersContent: 'Owners Content',
        groupsContent: 'Groups Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const privateResultSet = `
          id
          privateContent
        `;
      const adminResultSet = `
          ${privateResultSet}
          owner
          authors
          customGroup
          customGroups
        `;
      const setWithOwnerAndGroupContent = `
          ${adminResultSet}
          ownerContent
          groupContent
        `;
      const setWithOwnersAndGroupsContent = `
          ${adminResultSet}
          ownersContent
          groupsContent
        `;
      const completeResultSet = `
          ${adminResultSet}
          ownerContent
          ownersContent
          groupContent
          groupsContent
        `;

      // admin(user1) creates a record with only allowed fields
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, setWithOwnersAndGroupsContent);
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['id'] = createResult1.data[createResultSetName].id;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      const nulledFields = ['customGroup', 'customGroups', 'privateContent'];
      expectNullFields(createResult1.data[createResultSetName], [...nulledFields, 'ownersContent', 'groupsContent']);

      // user1 can update the allowed fields and add user2 to dyamic owners list field
      const todoUpdated1 = {
        id: todo['id'],
        authors: [userName1, userName2],
        customGroups: [adminGroupName, devGroupName],
        privateContent: 'Private Content updated',
        ownerContent: 'Owner Content',
        groupContent: 'Group Content',
      };
      const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, setWithOwnerAndGroupContent);
      expect(updateResult1.data[updateResultSetName].id).toEqual(todo['id']);
      expectNullFields(updateResult1.data[updateResultSetName], [...nulledFields, 'ownerContent', 'groupContent']);

      // user1 can read the allowed fields
      const getResult1 = await user1TodoHelper.get(
        {
          id: todo['id'],
        },
        completeResultSet,
        false,
      );
      checkOperationResult(getResult1, { ...todo, ...todoUpdated1 }, `get${modelName}`);

      const listTodosResult1 = await user1TodoHelper.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['id'], true);

      // unless one has delete access to all fields in the model, delete is expected to fail
      await expect(
        async () => await user1TodoHelper.delete(`delete${modelName}`, { id: todo['id'] }, privateResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(`delete${modelName}`, 'Mutation'));

      // user2 can update the private field
      const todoUpdated2 = {
        id: todo['id'],
        privateContent: 'Private Content updated 1',
      };
      const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, privateResultSet);
      expect(updateResult2.data[updateResultSetName].id).toEqual(todo['id']);
      expectNullFields(updateResult2.data[updateResultSetName], ['privateContent']);

      // user2 can read the allowed fields
      const user2ReadAllowedSet = `
          id
          privateContent
          ownersContent
          groupsContent
        `;
      const getResult2 = await user2TodoHelper.get(
        {
          id: todo['id'],
        },
        user2ReadAllowedSet,
        false,
      );
      checkOperationResult(
        getResult2,
        {
          id: todo['id'],
          privateContent: todoUpdated2['privateContent'],
          ownersContent: todo['ownersContent'],
          groupsContent: todo['groupsContent'],
        },
        `get${modelName}`,
      );

      const listTodosResult2 = await user2TodoHelper.list({}, user2ReadAllowedSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['id'], true);

      // owner can listen to updates on allowed fields
      const todoRandom = {
        ...todo,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoUpdated1,
        id: todoRandom.id,
        owner: userName1,
        privateContent: 'Private Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await user1TodoHelper.create(createResultSetName, todoRandom, setWithOwnersAndGroupsContent);
          },
        ],
        {},
        setWithOwnersAndGroupsContent,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, customGroup: null, customGroups: null, privateContent: null, ownersContent: null, groupsContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, setWithOwnerAndGroupContent);
          },
        ],
        {},
        setWithOwnerAndGroupContent,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, customGroup: null, customGroups: null, privateContent: null, ownerContent: null, groupContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, setWithOwnersAndGroupsContent, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('admin group protected model and restricted field operations', async () => {
      const modelName = 'TodoAdminContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        privateContent: 'Private Content',
        ownersContent: 'Owners Content',
        groupsContent: 'Groups Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const privateResultSet = `
          id
          privateContent
        `;
      const adminResultSet = `
          ${privateResultSet}
          owner
          authors
          customGroup
          customGroups
        `;
      const setWithOwnerAndGroupContent = `
          ${adminResultSet}
          ownerContent
          groupContent
        `;
      const setWithOwnersAndGroupsContent = `
          ${adminResultSet}
          ownersContent
          groupsContent
        `;

      // admin cannot create a record with public protected field
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, publicContent: 'Public Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // admin owner cannot create a record with a owner protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, ownerContent: 'Owner Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // admin cannot create a record with a group protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, groupContent: 'Group Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // Create a record with allowed fields, so we can test the update and delete operations.
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, setWithOwnersAndGroupsContent);
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult1.data[createResultSetName].id;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      const nulledFields = ['customGroup', 'customGroups', 'privateContent'];
      expectNullFields(createResult1.data[createResultSetName], [...nulledFields, 'ownersContent']);

      const publicFieldSet = `
          id
          publicContent
        `;
      // admin cannot update a record with public protected field
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { id: todo['id'], publicContent: 'Public Content' }, publicFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // admin cannot update a record with dynamic list of owners protected field that does not allow update operation
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { ...todo, ownersContent: 'Owners Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // admin cannot update a record with dynamic list of customGroups protected field that does not allow update operation
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { ...todo, groupsContent: 'Groups Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-admin cannot update a record to re-assign ownership
      const ownerFieldSet = `
          id
          owner
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { id: todo['id'], owner: 'user2' }, ownerFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-admin cannot update a record to re-assign owners in dynamic owners list
      const ownersFieldSet = `
          id
          authors
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { id: todo['id'], authors: ['user2'] }, ownersFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-admin cannot update a record to re-assign group membership
      const groupFieldSet = `
        id
        customGroup
      `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { id: todo['id'], customGroup: devGroupName }, groupFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-admin cannot update a record to re-assign group memberships stored as dynamic list
      const groupsFieldSet = `
          id
          customGroups
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { id: todo['id'], customGroups: [devGroupName] }, groupsFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner cannot update a record with an owner protected field
      const ownerContentFieldSet = `
          id
          ownerContent
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { ...todo, ownerContent: 'Owner Content' }, ownerContentFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-member of group cannot update a record with a group protected field
      const groupContentFieldSet = `
          id
          groupContent
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { ...todo, groupContent: 'Group Content' }, groupContentFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // admin cannot read a record with public protected field
      const getResult1 = await user1TodoHelper.get({ id: todo['id'] }, publicFieldSet, false, 'all');
      checkOperationResult(
        getResult1,
        { id: todo['id'], publicContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(['publicContent'], modelName),
      );

      const listTodosResult1 = await user1TodoHelper.list({}, publicFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult1, expectedFieldErrors(['publicContent'], modelName, false));

      // non-admin and non-owner cannot read a record with owner and group protected fields in the selection set
      const ownerReadFieldSet = `
        id
        owner
        authors
        customGroup
        customGroups
        ownerContent
        ownersContent
        groupContent
        groupsContent
      `;
      const getResult2 = await user2TodoHelper.get({ id: todo['id'] }, ownerReadFieldSet, false, 'all');
      const expectedReadErrorFields = ['owner', 'authors', 'ownerContent', 'ownersContent', 'groupContent', 'groupsContent'];
      checkOperationResult(
        getResult2,
        {
          id: todo['id'],
          owner: null,
          authors: null,
          customGroup: null,
          customGroups: null,
          ownerContent: null,
          ownersContent: null,
          groupContent: null,
          groupsContent: null,
        },
        `get${modelName}`,
        false,
        expectedFieldErrors(expectedReadErrorFields, modelName),
      );

      const listTodosResult2 = await user2TodoHelper.list({}, ownerReadFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(expectedReadErrorFields, modelName, false));

      // non-admin/owner cannot listen to updates on owner/group protected fields
      const todoRandom = {
        ...todo,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        id: todoRandom.id,
        owner: userName1,
        privateContent: 'Private Content updated',
        ownerContent: 'Owner Content updated',
        groupContent: 'Group Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await user1TodoHelper.create(createResultSetName, todoRandom, setWithOwnersAndGroupsContent);
        },
      ]);
      const expectedSubscriptionNullFields = [
        'ownerContent',
        'ownersContent',
        'groupContent',
        'groupsContent',
        'privateContent',
        'publicContent',
      ];
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].id).toEqual(todoRandom.id);
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], expectedSubscriptionNullFields);

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, setWithOwnerAndGroupContent);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].id).toEqual(todoRandom.id);
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], expectedSubscriptionNullFields);

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', []);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('custom group field protected model and allowed field operations', async () => {
      const modelName = 'TodoCustomGroupContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        customId: Date.now().toString(),
        owner: userName1,
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        privateContent: 'Private Content',
        ownersContent: 'Owners Content',
        adminContent: 'Admin Content',
        groupsContent: 'Groups Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const deleteResultSetName = `delete${modelName}`;
      const privateResultSet = `
          customId
          privateContent
        `;
      const adminResultSet = `
          ${privateResultSet}
          owner
          authors
          customGroup
          customGroups
          adminContent
        `;
      const setWithOwnerContent = `
          ${adminResultSet}
          ownerContent
        `;
      const setWithOwnersAndGroupsContent = `
          ${adminResultSet}
          ownersContent
          groupsContent
        `;
      const completeResultSet = `
          ${adminResultSet}
          ownerContent
          ownersContent
          groupsContent
        `;

      // admin(user1) creates a record with only allowed fields
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, setWithOwnersAndGroupsContent);
      expect(createResult1.data[createResultSetName].customId).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['customId'] = createResult1.data[createResultSetName].customId;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      const nulledMutationFields = ['customGroup', 'customGroups', 'privateContent', 'adminContent'];
      expectNullFields(createResult1.data[createResultSetName], [...nulledMutationFields, 'ownersContent', 'groupsContent']);

      // user in allowed group can update the allowed fields and add user2 to dyamic owners list field
      const todoUpdated1 = {
        customId: todo['customId'],
        authors: [userName1, userName2],
        customGroups: [adminGroupName, devGroupName],
        privateContent: 'Private Content updated',
        ownerContent: 'Owner Content',
      };
      const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, setWithOwnerContent);
      expect(updateResult1.data[updateResultSetName].customId).toEqual(todo['customId']);
      expect(updateResult1.data[updateResultSetName].owner).toEqual(userName1);
      expect(updateResult1.data[updateResultSetName].authors).toEqual(todoUpdated1.authors);
      expectNullFields(updateResult1.data[updateResultSetName], [...nulledMutationFields, 'ownerContent']);

      // user in allowed group can read the allowed fields
      const getResult1 = await user1TodoHelper.get(
        {
          customId: todo['customId'],
        },
        completeResultSet,
        false,
        'all',
        'customId',
      );
      checkOperationResult(getResult1, { ...todo, ...todoUpdated1 }, `get${modelName}`);

      const listTodosResult1 = await user1TodoHelper.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['customId'], true, 'customId');

      // user not in allowed group can update the private field
      const todoUpdated2 = {
        customId: todo['customId'],
        privateContent: 'Private Content updated 1',
      };
      const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, privateResultSet);
      expect(updateResult2.data[updateResultSetName].customId).toEqual(todo['customId']);
      expectNullFields(updateResult2.data[updateResultSetName], ['privateContent']);

      // user2 who is now in allowed group can read the allowed fields
      const user2ReadAllowedSet = `
          customId
          privateContent
          ownersContent
          groupsContent
        `;
      const getResult2 = await user2TodoHelper.get(
        {
          customId: todo['customId'],
        },
        user2ReadAllowedSet,
        false,
        'all',
        'customId',
      );
      checkOperationResult(
        getResult2,
        {
          customId: todo['customId'],
          privateContent: todoUpdated2['privateContent'],
          ownersContent: todo['ownersContent'],
          groupsContent: todo['groupsContent'],
        },
        `get${modelName}`,
      );

      const listTodosResult2 = await user2TodoHelper.list({}, user2ReadAllowedSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');

      // user in allowed group can delete the record
      const deleteResult1 = await user1TodoHelper.delete(deleteResultSetName, { customId: todo.customId }, completeResultSet);
      expect(deleteResult1.data[deleteResultSetName].customId).toEqual(todo['customId']);
      expectNullFields(deleteResult1.data[deleteResultSetName], [
        ...nulledMutationFields,
        'ownerContent',
        'ownersContent',
        'groupsContent',
      ]);

      // user in allowed group can listen to updates on allowed fields
      const todoRandom = {
        ...todo,
        customId: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoUpdated1,
        customId: todoRandom.customId,
        owner: userName1,
        privateContent: 'Private Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await user1TodoHelper.create(createResultSetName, todoRandom, setWithOwnersAndGroupsContent);
          },
        ],
        {},
        setWithOwnersAndGroupsContent,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        {
          ...todoRandom,
          customGroup: null,
          customGroups: null,
          privateContent: null,
          ownersContent: null,
          adminContent: null,
          groupsContent: null,
        },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, setWithOwnerContent);
          },
        ],
        {},
        setWithOwnerContent,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, customGroup: null, customGroups: null, privateContent: null, ownerContent: null, adminContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe(
        'onDelete',
        [
          async () => {
            await user1TodoHelper.delete(deleteResultSetName, { customId: todoRandom.customId }, completeResultSet);
          },
        ],
        {},
        completeResultSet,
        false,
      );
      expect(onDeleteSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onDeleteSubscriptionResult[0],
        {
          ...todoRandomUpdated,
          customGroup: null,
          customGroups: null,
          privateContent: null,
          ownerContent: null,
          ownersContent: null,
          adminContent: null,
          groupsContent: null,
        },
        `onDelete${modelName}`,
      );
    });

    test('custom group field protected model and restricted field operations', async () => {
      const modelName = 'TodoCustomGroupContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        customId: Date.now().toString(),
        owner: userName1,
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        privateContent: 'Private Content',
        ownersContent: 'Owners Content',
        adminContent: 'Admin Content',
        groupsContent: 'Groups Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const deleteResultSetName = `delete${modelName}`;
      const privateResultSet = `
          customId
          privateContent
        `;
      const adminResultSet = `
          ${privateResultSet}
          owner
          authors
          customGroup
          customGroups
          adminContent
        `;
      const setWithOwnerContent = `
          ${adminResultSet}
          ownerContent
        `;
      const setWithOwnersAndGroupsContent = `
          ${adminResultSet}
          ownersContent
          groupsContent
        `;

      const completeResultSet = `
          ${adminResultSet}
          ownerContent
          ownersContent
          groupsContent
        `;

      // user in allowed group cannot create a record with public protected field
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, publicContent: 'Public Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // user in allowed group cannot create a record with owner protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, ownerContent: 'Owner Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // Create a record with allowed fields, so we can test the update and delete operations.
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, setWithOwnersAndGroupsContent);
      expect(createResult1.data[createResultSetName].customId).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['customId'] = createResult1.data[createResultSetName].customId;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      const nulledAdminFields = ['customGroup', 'customGroups', 'privateContent', 'adminContent'];
      expectNullFields(createResult1.data[createResultSetName], [...nulledAdminFields, 'ownersContent', 'groupsContent']);

      const publicFieldSet = `
          customId
          publicContent
        `;
      // user in allowed group cannot update a record with public protected field
      await expect(
        async () =>
          await user1TodoHelper.update(
            updateResultSetName,
            { customId: todo['customId'], publicContent: 'Public Content' },
            publicFieldSet,
          ),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user in allowed group cannot update a record with dynamic list of owners protected field that does not allow update operation
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { ...todo, ownersContent: 'Owners Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user in allowed group cannot update a record with dynamic list of groups protected field that does not allow update operation
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { ...todo, groupsContent: 'Groups Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user not in allowed group cannot update a record to re-assign ownership
      const ownerFieldSet = `
          customId
          owner
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { customId: todo['customId'], owner: 'user2' }, ownerFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user not in allowed group cannot update a record to re-assign owners in dynamic owners list
      const ownersFieldSet = `
          customId
          authors
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { customId: todo['customId'], authors: ['user2'] }, ownersFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user not in allowed group cannot update a record to re-assign group membership
      const groupFieldSet = `
          customId
          customGroup
        `;
      await expect(
        async () =>
          await user2TodoHelper.update(updateResultSetName, { customId: todo['customId'], customGroup: devGroupName }, groupFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user not in allowed group cannot update a record to re-assign group memberships stored as dynamic list
      const groupsFieldSet = `
          customId
          customGroups
        `;
      await expect(
        async () =>
          await user2TodoHelper.update(updateResultSetName, { customId: todo['customId'], customGroups: [devGroupName] }, groupsFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user not in allowed group cannot update a record with an owner protected field
      const ownerContentFieldSet = `
          customId
          ownerContent
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { ...todo, ownerContent: 'Owner Content' }, ownerContentFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user in allowed group cannot read a record with public protected field
      const getResult1 = await user1TodoHelper.get({ customId: todo['customId'] }, publicFieldSet, false, 'all', 'customId');
      checkOperationResult(
        getResult1,
        { customId: todo['customId'], publicContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(['publicContent'], modelName),
      );

      const listTodosResult1 = await user1TodoHelper.list({}, publicFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['customId'], true, 'customId');
      checkListResponseErrors(listTodosResult1, expectedFieldErrors(['publicContent'], modelName, false));

      // user not in allowed group and non-owner cannot read a record with owner and group protected fields in the selection set
      const readFieldSet = `
        customId
        owner
        authors
        customGroup
        customGroups
        ownerContent
        ownersContent
        adminContent
        groupsContent
      `;
      const getResult2 = await user2TodoHelper.get({ customId: todo['customId'] }, readFieldSet, false, 'all', 'customId');
      const expectedReadErrorFields = [
        'owner',
        'authors',
        'customGroup',
        'customGroups',
        'ownerContent',
        'ownersContent',
        'adminContent',
        'groupsContent',
      ];
      checkOperationResult(
        getResult2,
        {
          customId: todo['customId'],
          owner: null,
          authors: null,
          customGroup: null,
          customGroups: null,
          ownerContent: null,
          ownersContent: null,
          adminContent: null,
          groupsContent: null,
        },
        `get${modelName}`,
        false,
        expectedFieldErrors(expectedReadErrorFields, modelName),
      );

      const listTodosResult2 = await user2TodoHelper.list({}, readFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(expectedReadErrorFields, modelName, false));

      // user not in allowed group cannot listen to updates on owner/group protected fields
      const todoRandom = {
        ...todo,
        customId: Date.now().toString(),
      };
      const todoRandomUpdated = {
        customId: todoRandom.customId,
        owner: userName1,
        privateContent: 'Private Content updated',
        ownerContent: 'Owner Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await user1TodoHelper.create(createResultSetName, todoRandom, setWithOwnersAndGroupsContent);
        },
      ]);
      const expectedSubscriptionNullFields = ['customGroup', 'customGroups', 'privateContent', 'publicContent'];
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].customId).toEqual(todoRandom.customId);
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], [
        ...expectedSubscriptionNullFields,
        'ownersContent',
        'adminContent',
        'groupsContent',
      ]);

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, setWithOwnerContent);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].customId).toEqual(todoRandom.customId);
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], [
        ...expectedSubscriptionNullFields,
        'ownerContent',
        'adminContent',
      ]);

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [
        async () => {
          await user1TodoHelper.delete(deleteResultSetName, { customId: todoRandom.customId }, completeResultSet);
        },
      ]);
      expect(onDeleteSubscriptionResult).toHaveLength(1);
      expect(onDeleteSubscriptionResult[0].data[`onDelete${modelName}`].customId).toEqual(todoRandom.customId);
      expectNullFields(onDeleteSubscriptionResult[0].data[`onDelete${modelName}`], [
        ...expectedSubscriptionNullFields,
        'ownerContent',
        'ownersContent',
        'adminContent',
        'groupsContent',
      ]);
    });

    test('custom list of groups field protected model and allowed field operations', async () => {
      const modelName = 'TodoCustomGroupsContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        customId: Date.now().toString(),
        owner: userName1,
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        privateContent: 'Private Content',
        adminContent: 'Admin Content',
        ownersContent: 'Owners Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const privateResultSet = `
          customId
          privateContent
        `;
      const adminResultSet = `
          ${privateResultSet}
          owner
          authors
          customGroup
          customGroups
          adminContent
        `;
      const setWithOwnerAndGroupContent = `
          ${adminResultSet}
          ownerContent
          groupContent
        `;
      const setWithOwnersContent = `
          ${adminResultSet}
          ownersContent
        `;
      const completeResultSet = `
          ${adminResultSet}
          ownerContent
          ownersContent
          groupContent
        `;

      // admin(user1) creates a record with only allowed fields
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, setWithOwnersContent);
      expect(createResult1.data[createResultSetName].customId).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['customId'] = createResult1.data[createResultSetName].customId;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      const nulledMutationFields = ['customGroup', 'customGroups', 'privateContent', 'adminContent'];
      expectNullFields(createResult1.data[createResultSetName], [...nulledMutationFields, 'ownersContent']);

      // user part of allowed groups can update the allowed fields and add user2 to dyamic owners list field
      const todoUpdated1 = {
        customId: todo['customId'],
        authors: [userName1, userName2],
        customGroups: [adminGroupName, devGroupName],
        privateContent: 'Private Content updated',
        ownerContent: 'Owner Content',
        groupContent: 'Group Content',
      };
      const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, setWithOwnerAndGroupContent);
      expect(updateResult1.data[updateResultSetName].customId).toEqual(todo['customId']);
      expect(updateResult1.data[updateResultSetName].owner).toEqual(userName1);
      expect(updateResult1.data[updateResultSetName].authors).toEqual(todoUpdated1.authors);
      expectNullFields(updateResult1.data[updateResultSetName], [...nulledMutationFields, 'ownerContent', 'groupContent']);

      // user part of allowed groups can read the allowed fields
      const getResult1 = await user1TodoHelper.get(
        {
          customId: todo['customId'],
        },
        completeResultSet,
        false,
        'all',
        'customId',
      );
      checkOperationResult(getResult1, { ...todo, ...todoUpdated1 }, `get${modelName}`);

      const listTodosResult1 = await user1TodoHelper.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['customId'], true, 'customId');

      // user not part of allowed groups can update the private field
      const todoUpdated2 = {
        customId: todo['customId'],
        privateContent: 'Private Content updated 1',
      };
      const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, privateResultSet);
      expect(updateResult2.data[updateResultSetName].customId).toEqual(todo['customId']);
      expectNullFields(updateResult2.data[updateResultSetName], ['privateContent']);

      // user2 who is now part of allowed groups can read the allowed fields
      const user2ReadAllowedSet = `
          customId
          privateContent
          ownersContent
        `;
      const getResult2 = await user2TodoHelper.get(
        {
          customId: todo['customId'],
        },
        user2ReadAllowedSet,
        false,
        'all',
        'customId',
      );
      checkOperationResult(
        getResult2,
        {
          customId: todo['customId'],
          privateContent: todoUpdated2['privateContent'],
          ownersContent: todo['ownersContent'],
        },
        `get${modelName}`,
      );

      const listTodosResult2 = await user2TodoHelper.list({}, user2ReadAllowedSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');

      // user part of allowed groups can listen to updates on allowed fields
      const todoRandom = {
        ...todo,
        customId: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoUpdated1,
        customId: todoRandom.customId,
        owner: userName1,
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await user1TodoHelper.create(createResultSetName, todoRandom, setWithOwnersContent);
          },
        ],
        {},
        setWithOwnersContent,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, customGroup: null, customGroups: null, privateContent: null, ownersContent: null, adminContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, setWithOwnerAndGroupContent);
          },
        ],
        {},
        setWithOwnerAndGroupContent,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        {
          ...todoRandomUpdated,
          customGroup: null,
          customGroups: null,
          privateContent: null,
          ownerContent: null,
          adminContent: null,
          groupContent: null,
        },
        `onUpdate${modelName}`,
      );
    });

    test('custom list of groups field protected model and restricted field operations', async () => {
      const modelName = 'TodoCustomGroupsContentVarious';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        customId: Date.now().toString(),
        owner: userName1,
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        privateContent: 'Private Content',
        ownersContent: 'Owners Content',
        adminContent: 'Admin Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const deleteResultSetName = `delete${modelName}`;
      const privateResultSet = `
          customId
          privateContent
        `;
      const adminResultSet = `
          ${privateResultSet}
          owner
          authors
          customGroup
          customGroups
          adminContent
        `;
      const setWithOwnerAndGroupContent = `
          ${adminResultSet}
          ownerContent
          groupContent
        `;
      const setWithOwnersContent = `
          ${adminResultSet}
          ownersContent
        `;

      const completeResultSet = `
          ${adminResultSet}
          ownerContent
          ownersContent
          groupContent
        `;

      // user part of allowed groups cannot create a record with public protected field
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, publicContent: 'Public Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // user part of allowed groups cannot create a record with owner protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, ownerContent: 'Owner Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // user part of allowed groups cannot create a record with list of groups protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, groupContent: 'Group Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // Create a record with allowed fields, so we can test the update and delete operations.
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, setWithOwnersContent);
      expect(createResult1.data[createResultSetName].customId).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['customId'] = createResult1.data[createResultSetName].customId;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      const nulledAdminFields = ['customGroup', 'customGroups', 'privateContent', 'adminContent'];
      expectNullFields(createResult1.data[createResultSetName], [...nulledAdminFields, 'ownersContent']);

      const publicFieldSet = `
          customId
          publicContent
        `;
      // user part of allowed groups cannot update a record with public protected field
      await expect(
        async () =>
          await user1TodoHelper.update(
            updateResultSetName,
            { customId: todo['customId'], publicContent: 'Public Content' },
            publicFieldSet,
          ),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user part of allowed groups cannot update a record with dynamic list of owners protected field that does not allow update operation
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { ...todo, ownersContent: 'Owners Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user not part of allowed groups cannot update a record to re-assign ownership
      const ownerFieldSet = `
          customId
          owner
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { customId: todo['customId'], owner: 'user2' }, ownerFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user not part of allowed groups cannot update a record to re-assign owners in dynamic owners list
      const ownersFieldSet = `
          customId
          authors
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { customId: todo['customId'], authors: ['user2'] }, ownersFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user not part of allowed groups cannot update a record to re-assign group membership
      const groupFieldSet = `
          customId
          customGroup
        `;
      await expect(
        async () =>
          await user2TodoHelper.update(updateResultSetName, { customId: todo['customId'], customGroup: devGroupName }, groupFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user not part of allowed groups cannot update a record to re-assign group memberships stored as dynamic list
      const groupsFieldSet = `
          customId
          customGroups
        `;
      await expect(
        async () =>
          await user2TodoHelper.update(updateResultSetName, { customId: todo['customId'], customGroups: [devGroupName] }, groupsFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user not part of allowed groups cannot update a record with an owner protected field
      const ownerContentFieldSet = `
          customId
          ownerContent
        `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { ...todo, ownerContent: 'Owner Content' }, ownerContentFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // user part of allowed groups cannot read a record with public protected field
      const getResult1 = await user1TodoHelper.get({ customId: todo['customId'] }, publicFieldSet, false, 'all', 'customId');
      checkOperationResult(
        getResult1,
        { customId: todo['customId'], publicContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(['publicContent'], modelName),
      );

      const listTodosResult1 = await user1TodoHelper.list({}, publicFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['customId'], true, 'customId');
      checkListResponseErrors(listTodosResult1, expectedFieldErrors(['publicContent'], modelName, false));

      // user not part of allowed groups and non-owner cannot read a record with owner and group protected fields in the selection set
      const readFieldSet = `
        customId
        owner
        authors
        customGroup
        customGroups
        ownerContent
        ownersContent
        adminContent
        groupContent
      `;
      const getResult2 = await user2TodoHelper.get({ customId: todo['customId'] }, readFieldSet, false, 'all', 'customId');
      const expectedReadErrorFields = [
        'owner',
        'authors',
        'customGroup',
        'customGroups',
        'ownerContent',
        'ownersContent',
        'adminContent',
        'groupContent',
      ];
      checkOperationResult(
        getResult2,
        {
          customId: todo['customId'],
          owner: null,
          authors: null,
          customGroup: null,
          customGroups: null,
          ownerContent: null,
          ownersContent: null,
          adminContent: null,
          groupContent: null,
        },
        `get${modelName}`,
        false,
        expectedFieldErrors(expectedReadErrorFields, modelName),
      );

      const listTodosResult2 = await user2TodoHelper.list({}, readFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(expectedReadErrorFields, modelName, false));

      // unless one has delete access to all fields in the model, delete is expected to fail
      await expect(
        async () => await user1TodoHelper.delete(`delete${modelName}`, { customId: todo['customId'] }, completeResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(`delete${modelName}`, 'Mutation'));

      // user not part of allowed groups cannot listen to updates on owner/group protected fields
      const todoRandom = {
        ...todo,
        customId: Date.now().toString(),
      };
      const todoRandomUpdated = {
        customId: todoRandom.customId,
        owner: userName1,
        privateContent: 'Private Content updated',
        ownerContent: 'Owner Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await user1TodoHelper.create(createResultSetName, todoRandom, setWithOwnersContent);
        },
      ]);
      const expectedSubscriptionNullFields = ['customGroup', 'customGroups', 'privateContent', 'publicContent'];
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].customId).toEqual(todoRandom.customId);
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], [
        ...expectedSubscriptionNullFields,
        'ownersContent',
        'adminContent',
      ]);

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, setWithOwnerAndGroupContent);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].customId).toEqual(todoRandom.customId);
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], [
        ...expectedSubscriptionNullFields,
        'ownerContent',
        'adminContent',
        'groupContent',
      ]);
    });

    describe('Non Model protected fields and allowed operations', () => {
      const modelName = 'TodoModel';
      const nonModelName = 'NoteNonModel';

      const note = {
        content: 'Note content',
        adminContent: 'Admin content',
      };
      const todoWithAdminNote = {
        name: 'Reading books',
        note,
      };
      const todoWithoutAdminNote = {
        name: 'Reading books',
        note: {
          content: note.content,
        },
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const deleteResultSetName = `delete${modelName}`;
      const privateResultSet = `
          id
          name
          note {
            content
          }
        `;
      const adminResultSet = `
          id
          name
          note {
            content
            adminContent
          }
        `;
      const todoUpdated1 = {
        name: 'Reading books updated',
        note: {
          content: 'Note content updated',
          adminContent: 'Admin content updated',
        },
      };

      const todoUpdated2 = {
        name: 'Reading books updated',
        note: {
          content: 'Note content updated',
        },
      };

      test('admin can create a record with all fields', async () => {
        const user1TodoHelper = user1ModelOperationHelpers[modelName];
        const createResult1 = await user1TodoHelper.create(createResultSetName, todoWithAdminNote, adminResultSet);
        expect(createResult1.data[createResultSetName].id).toBeDefined();
        todoWithAdminNote['id'] = createResult1.data[createResultSetName].id;
        checkOperationResult(
          createResult1,
          { ...todoWithAdminNote, note: { ...todoWithAdminNote.note, __typename: nonModelName } },
          createResultSetName,
        );
      });

      test('non-admin can create a record with private non-model fields', async () => {
        const user2TodoHelper = user2ModelOperationHelpers[modelName];
        const createResult2 = await user2TodoHelper.create(createResultSetName, todoWithoutAdminNote, privateResultSet);
        expect(createResult2.data[createResultSetName].id).toBeDefined();
        todoWithoutAdminNote['id'] = createResult2.data[createResultSetName].id;
        checkOperationResult(
          createResult2,
          { ...todoWithoutAdminNote, note: { ...todoWithoutAdminNote.note, __typename: nonModelName } },
          createResultSetName,
        );
      });

      test('admin can update all non-model fields', async () => {
        const user1TodoHelper = user1ModelOperationHelpers[modelName];
        todoUpdated1['id'] = todoWithAdminNote['id'];
        const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, adminResultSet);
        expect(updateResult1.data[updateResultSetName].id).toEqual(todoUpdated1['id']);
        checkOperationResult(
          updateResult1,
          { ...todoUpdated1, note: { ...todoUpdated1.note, __typename: nonModelName } },
          updateResultSetName,
        );
      });

      test('non-admin can update private non-model fields', async () => {
        const user2TodoHelper = user2ModelOperationHelpers[modelName];
        todoUpdated2['id'] = todoWithoutAdminNote['id'];
        const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, privateResultSet);
        expect(updateResult2.data[updateResultSetName].id).toEqual(todoUpdated2['id']);
        checkOperationResult(
          updateResult2,
          { ...todoUpdated2, note: { ...todoUpdated2.note, __typename: nonModelName } },
          updateResultSetName,
        );
      });

      test('admin can read all non-model fields', async () => {
        const user1TodoHelper = user1ModelOperationHelpers[modelName];
        const getResult1 = await user1TodoHelper.get(
          {
            id: todoWithAdminNote['id'],
          },
          adminResultSet,
          false,
        );
        checkOperationResult(
          getResult1,
          { ...todoWithAdminNote, ...todoUpdated1, note: { ...todoUpdated1.note, __typename: nonModelName } },
          `get${modelName}`,
        );

        const listTodosResult1 = await user1TodoHelper.list({}, adminResultSet, `list${modelName}s`, false, 'all');
        checkListItemExistence(listTodosResult1, `list${modelName}s`, todoWithAdminNote['id'], true);
      });

      test('non-admin can read private non-model fields', async () => {
        const user2TodoHelper = user2ModelOperationHelpers[modelName];
        const getResult2 = await user2TodoHelper.get(
          {
            id: todoWithoutAdminNote['id'],
          },
          privateResultSet,
          false,
        );
        checkOperationResult(
          getResult2,
          { ...todoWithoutAdminNote, ...todoUpdated2, note: { ...todoUpdated2.note, __typename: nonModelName } },
          `get${modelName}`,
        );

        const listTodosResult2 = await user2TodoHelper.list({}, privateResultSet, `list${modelName}s`, false, 'all');
        checkListItemExistence(listTodosResult2, `list${modelName}s`, todoWithoutAdminNote['id'], true);
      });

      test('admin can delete the record', async () => {
        const user1TodoHelper = user1ModelOperationHelpers[modelName];
        const deleteResult1 = await user1TodoHelper.delete(deleteResultSetName, { id: todoWithAdminNote['id'] }, adminResultSet);
        expect(deleteResult1.data[deleteResultSetName].id).toEqual(todoWithAdminNote['id']);
        checkOperationResult(
          deleteResult1,
          { ...todoUpdated1, note: { ...todoUpdated1.note, __typename: nonModelName } },
          deleteResultSetName,
        );
      });

      test('non-admin can listen to mutations on all fields', async () => {
        const user1TodoHelper = user1ModelOperationHelpers[modelName];
        // TODO: non-models auth field redaction. Re-visit this test after we decide the expected behavior.
        const todoRandom = {
          ...todoWithAdminNote,
          id: Date.now().toString(),
        };
        const todoRandomUpdated = {
          ...todoUpdated1,
          id: todoRandom.id,
        };
        const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
        const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

        const onCreateSubscriptionResult = await subTodoHelper.subscribe(
          'onCreate',
          [
            async () => {
              await user1TodoHelper.create(createResultSetName, todoRandom, adminResultSet);
            },
          ],
          {},
          adminResultSet,
          false,
        );
        expect(onCreateSubscriptionResult).toHaveLength(1);
        const onCreateResultData = onCreateSubscriptionResult[0].data[`onCreate${modelName}`];
        expect(onCreateResultData?.id).toEqual(todoRandom.id);
        checkOperationResult(
          onCreateSubscriptionResult[0],
          { ...todoRandom, note: { ...todoRandom.note, __typename: nonModelName } },
          `onCreate${modelName}`,
        );

        const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
          'onUpdate',
          [
            async () => {
              await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, adminResultSet);
            },
          ],
          {},
          adminResultSet,
          false,
        );
        expect(onUpdateSubscriptionResult).toHaveLength(1);
        const onUpdateResultData = onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`];
        expect(onUpdateResultData?.id).toEqual(todoRandomUpdated.id);
        checkOperationResult(
          onUpdateSubscriptionResult[0],
          { ...todoRandomUpdated, note: { ...todoRandomUpdated.note, __typename: nonModelName } },
          `onUpdate${modelName}`,
        );

        const onDeleteSubscriptionResult = await subTodoHelper.subscribe(
          'onDelete',
          [
            async () => {
              await user1TodoHelper.delete(deleteResultSetName, { id: todoRandomUpdated.id }, adminResultSet);
            },
          ],
          {},
          adminResultSet,
          false,
        );
        expect(onDeleteSubscriptionResult).toHaveLength(1);
        const onDeleteResultData = onDeleteSubscriptionResult[0].data[`onDelete${modelName}`];
        expect(onDeleteResultData?.id).toEqual(todoRandomUpdated.id);
        checkOperationResult(
          onDeleteSubscriptionResult[0],
          { ...todoRandomUpdated, note: { ...todoRandomUpdated.note, __typename: nonModelName } },
          `onDelete${modelName}`,
        );
      });
    });

    describe('Non Model protected fields and restricted operations', () => {
      const modelName = 'TodoModel';
      const nonModelName = 'NoteNonModel';

      const note = {
        content: 'Note content',
        adminContent: 'Admin content',
      };
      const todoWithAdminNote = {
        name: 'Reading books',
        note,
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const deleteResultSetName = `delete${modelName}`;

      const adminResultSet = `
          id
          name
          note {
            content
            adminContent
          }
        `;

      test('non-admin cannot create a record with admin protected non-model field', async () => {
        const user2TodoHelper = user2ModelOperationHelpers[modelName];
        await expect(
          async () => await user2TodoHelper.create(createResultSetName, todoWithAdminNote, adminResultSet),
        ).rejects.toThrowErrorMatchingInlineSnapshot(expectedFieldErrors(['adminContent'], nonModelName)[0]);
      });

      test('admin can create a record with all fields', async () => {
        const user1TodoHelper = user1ModelOperationHelpers[modelName];
        const createResult1 = await user1TodoHelper.create(createResultSetName, todoWithAdminNote, adminResultSet);
        expect(createResult1.data[createResultSetName].id).toBeDefined();
        todoWithAdminNote['id'] = createResult1.data[createResultSetName].id;
      });

      test('non-admin cannot get the admin protected field during update', async () => {
        const user2TodoHelper = user2ModelOperationHelpers[modelName];
        await expect(
          async () =>
            await user2TodoHelper.update(
              updateResultSetName,
              { id: todoWithAdminNote['id'], note: { adminContent: 'Admin content updated', content: 'content updated' } },
              adminResultSet,
            ),
        ).rejects.toThrowErrorMatchingInlineSnapshot(expectedFieldErrors(['adminContent'], nonModelName)[0]);
      });

      test('non-admin cannot read the admin protected non-model field', async () => {
        const user2TodoHelper = user2ModelOperationHelpers[modelName];
        const getResult1 = await user2TodoHelper.get({ id: todoWithAdminNote['id'] }, adminResultSet, false, 'all');
        checkOperationResult(
          getResult1,
          {
            ...todoWithAdminNote,
            note: { ...todoWithAdminNote.note, adminContent: null, __typename: nonModelName, content: 'content updated' },
          },
          `get${modelName}`,
          false,
          expectedFieldErrors(['adminContent'], modelName),
        );

        const listTodosResult1 = await user2TodoHelper.list({}, adminResultSet, `list${modelName}s`, false, 'all');
        checkListItemExistence(listTodosResult1, `list${modelName}s`, todoWithAdminNote['id'], true);
        checkListResponseErrors(listTodosResult1, expectedFieldErrors(['adminContent'], nonModelName, false));
      });

      test('non-admin cannot get the admin protected field during delete', async () => {
        const user2TodoHelper = user2ModelOperationHelpers[modelName];
        await expect(
          async () => await user2TodoHelper.delete(deleteResultSetName, { id: todoWithAdminNote['id'] }, adminResultSet),
        ).rejects.toThrowErrorMatchingInlineSnapshot(expectedFieldErrors(['adminContent'], nonModelName)[0]);
      });
    });

    test('Model with renamed protected fields and allowed operations', async () => {
      const modelName = 'TodoRenamedFields';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        privateContent: 'Private Content',
        author: userName1,
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        ownerContent: 'Owner Content',
        adminContent: 'Admin Content',
        groupContent: 'Group Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const user1CreateAllowedSet = `
        id
        privateContent
        author
        authors
        customGroup
        customGroups
        ownerContent
        adminContent
        groupContent
      `;

      // owner(user1) creates a record with only allowed fields
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, user1CreateAllowedSet);
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].author).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      expect(createResult1.data[createResultSetName].privateContent).toEqual(todo.privateContent);
      expect(createResult1.data[createResultSetName].customGroup).toEqual(todo.customGroup);
      expect(createResult1.data[createResultSetName].customGroups).toEqual(todo.customGroups);
      todo['id'] = createResult1.data[createResultSetName].id;
      // protected fields are nullified in mutation responses
      expectNullFields(createResult1.data[createResultSetName], ['ownerContent', 'adminContent', 'groupContent']);

      // user1 can update the allowed fields and add user2 to dyamic owners and groups list fields
      const todoUpdated1 = {
        id: todo['id'],
        authors: [userName1, userName2],
        customGroups: [adminGroupName, devGroupName],
        privateContent: 'Private Content updated',
        ownersContent: 'Owners Content updated',
        adminContent: 'Admin Content updated',
        groupsContent: 'Groups Content updated',
      };
      const user1UpdateAllowedSet = `
        id
        author
        authors
        customGroup
        customGroups
        privateContent
        ownersContent
        adminContent
        groupsContent
      `;
      const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, user1UpdateAllowedSet);
      expect(updateResult1.data[updateResultSetName].id).toEqual(todo['id']);
      expect(updateResult1.data[updateResultSetName].author).toEqual(userName1);
      expect(updateResult1.data[updateResultSetName].authors).toEqual([userName1, userName2]);
      expect(updateResult1.data[updateResultSetName].privateContent).toEqual(todoUpdated1.privateContent);
      expect(updateResult1.data[updateResultSetName].customGroup).toEqual(todo.customGroup);
      expect(updateResult1.data[updateResultSetName].customGroups).toEqual(todoUpdated1.customGroups);
      expectNullFields(updateResult1.data[updateResultSetName], ['ownersContent', 'adminContent', 'groupsContent']);

      // user1 can read the allowed fields
      const completeResultSet = `
        id
        author
        authors
        customGroup
        customGroups
        privateContent
        ownerContent
        ownersContent
        adminContent
        groupContent
        groupsContent
      `;
      const user1ReadAllowedSet = completeResultSet;
      const getResult1 = await user1TodoHelper.get(
        {
          id: todo['id'],
        },
        user1ReadAllowedSet,
        false,
      );
      checkOperationResult(getResult1, { ...todo, ...todoUpdated1 }, `get${modelName}`);

      const listTodosResult1 = await user1TodoHelper.list({}, user1ReadAllowedSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['id'], true);

      // user2 can update the private and dynamic owners list protected fields.
      const todoUpdated2 = {
        id: todo['id'],
        author: todo['author'],
        authors: [userName2],
        customGroup: devGroupName,
        customGroups: [devGroupName],
        privateContent: 'Private Content updated 1',
        ownersContent: 'Owners Content updated 1',
        groupsContent: 'Groups Content updated 1',
      };
      const user2UpdateAllowedSet = `
        id
        author
        authors
        customGroup
        customGroups
        privateContent
        ownersContent
        groupsContent
      `;
      const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, user2UpdateAllowedSet);
      expect(updateResult2.data[updateResultSetName].id).toEqual(todo['id']);
      expect(updateResult2.data[updateResultSetName].author).toEqual(userName1);
      expect(updateResult2.data[updateResultSetName].authors).toEqual([userName2]);
      expect(updateResult2.data[updateResultSetName].privateContent).toEqual(todoUpdated2.privateContent);
      expect(updateResult2.data[updateResultSetName].customGroup).toEqual(todoUpdated2.customGroup);
      expect(updateResult2.data[updateResultSetName].customGroups).toEqual(todoUpdated2.customGroups);
      expectNullFields(updateResult2.data[updateResultSetName], ['ownersContent', 'groupsContent']);

      // user2 can read the allowed fields
      const user2ReadAllowedSet = user2UpdateAllowedSet;
      const getResult2 = await user2TodoHelper.get(
        {
          id: todo['id'],
        },
        user2ReadAllowedSet,
        false,
      );
      checkOperationResult(getResult2, todoUpdated2, `get${modelName}`);

      const listTodosResult2 = await user2TodoHelper.list({}, user2ReadAllowedSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['id'], true);

      // unless one has delete access to all fields in the model, delete is expected to fail
      await expect(
        async () => await user1TodoHelper.delete(`delete${modelName}`, { id: todo['id'] }, user1CreateAllowedSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(`delete${modelName}`, 'Mutation'));

      // user2 can listen to updates on the non-protected fields
      const todoRandom = {
        ...todo,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoUpdated1,
        id: todoRandom.id,
        author: userName1,
        privateContent: 'Private Content updated',
        adminContent: 'Admin Content updated',
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await user1TodoHelper.create(createResultSetName, todoRandom, user1CreateAllowedSet);
          },
        ],
        {},
        user1CreateAllowedSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].privateContent).toEqual(todoRandom.privateContent);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].customGroup).toEqual(todoRandom.customGroup);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].customGroups).toEqual(todoRandom.customGroups);
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], ['ownerContent', 'adminContent', 'groupContent']);

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, user1UpdateAllowedSet);
          },
        ],
        {},
        user1UpdateAllowedSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].privateContent).toEqual(todoRandomUpdated.privateContent);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].customGroup).toEqual(todoRandom.customGroup);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].customGroups).toEqual(todoRandomUpdated.customGroups);
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], ['ownersContent', 'adminContent', 'groupsContent']);

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, user1UpdateAllowedSet, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('Model with renamed protected fields and restricted operations', async () => {
      const modelName = 'TodoRenamedFields';
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todoPrivateFields = {
        author: userName1,
        authors: [userName1],
        customGroup: adminGroupName,
        customGroups: [adminGroupName],
        privateContent: 'Private Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const privateResultSet = `
        id
        author
        authors
        customGroup
        customGroups
        privateContent
      `;

      // cannot create a record with dynamic owner list protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todoPrivateFields, ownersContent: 'Owners Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // cannot create a record with dynamic groups list protected field that does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todoPrivateFields, groupsContent: 'Groups Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // Create a record with allowed fields, so we can test the update and delete operations.
      const user1CreateAllowedSet = `
        ${privateResultSet}
        ownerContent
        adminContent
        groupContent
      `;
      const createResult1 = await user1TodoHelper.create(
        createResultSetName,
        { ...todoPrivateFields, ownerContent: 'Owner Content', adminContent: 'Admin Content', groupContent: 'Group Content' },
        user1CreateAllowedSet,
      );
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].author).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      expect(createResult1.data[createResultSetName].privateContent).toEqual(todoPrivateFields.privateContent);
      expect(createResult1.data[createResultSetName].customGroup).toEqual(todoPrivateFields.customGroup);
      expect(createResult1.data[createResultSetName].customGroups).toEqual(todoPrivateFields.customGroups);
      todoPrivateFields['id'] = createResult1.data[createResultSetName].id;
      // protected fields are nullified in mutation responses
      expectNullFields(createResult1.data[createResultSetName], ['ownerContent', 'adminContent', 'groupContent']);

      const privateAndOwnerSet = `
        ${privateResultSet}
        ownerContent
      `;
      // cannot update a record with owner protected field that does not allow update operation
      await expect(
        async () =>
          await user1TodoHelper.update(updateResultSetName, { ...todoPrivateFields, ownerContent: 'Owner Content' }, privateAndOwnerSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      const privateAndOwnersSet = `
        ${privateResultSet}
        ownersContent
      `;
      // non-owner cannot update a record with dynamic owner list protected field
      await expect(
        async () =>
          await user2TodoHelper.update(updateResultSetName, { ...todoPrivateFields, ownersContent: 'Owners Content' }, privateAndOwnersSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      const privateAndGroupSet = `
          ${privateResultSet}
          groupContent
        `;
      // cannot update a record with group protected field that does not allow update operation
      await expect(
        async () =>
          await user1TodoHelper.update(updateResultSetName, { ...todoPrivateFields, groupContent: 'Group Content' }, privateAndGroupSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      const privateAndGroupsSet = `
        ${privateResultSet}
        groupsContent
      `;
      // non-owner cannot update a record with dynamic group list protected field
      await expect(
        async () =>
          await user2TodoHelper.update(updateResultSetName, { ...todoPrivateFields, groupsContent: 'Groups Content' }, privateAndGroupsSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // non-owner or user not part of allowed groups cannot read owner, group protected fields
      const ownerAndGroupFields = ['ownerContent', 'ownersContent', 'adminContent', 'groupContent', 'groupsContent'];
      const nonPublicSet = `
        ${privateResultSet}
        ${ownerAndGroupFields.join('\n')}
      `;
      const getResult2 = await user2TodoHelper.get({ id: todoPrivateFields['id'] }, nonPublicSet, false, 'all');
      checkOperationResult(
        getResult2,
        { ...todoPrivateFields, ownerContent: null, ownersContent: null, adminContent: null, groupContent: null, groupsContent: null },
        `get${modelName}`,
        false,
        expectedFieldErrors(ownerAndGroupFields, modelName),
      );

      const listTodosResult2 = await user2TodoHelper.list({}, nonPublicSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todoPrivateFields['id'], true);
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(ownerAndGroupFields, modelName, false));
    });
  });
};
