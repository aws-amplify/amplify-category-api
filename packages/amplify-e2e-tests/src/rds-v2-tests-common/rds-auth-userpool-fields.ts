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
    let appSyncClients = {};
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
      appSyncClients = await configureAppSyncClients(projRoot, apiName, [userPoolProvider, apiKeyProvider], userMap);
    };

    test('Private model auth and allowed field operations', async () => {
      const modelName = 'TodoPrivateContentVarious';
      const user1ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const user2ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        privateContent: 'Private Content',
        ownerContent: 'Owner Content',
        authors: [userName1],
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const user1CreateAllowedSet = `
        id
        owner
        authors
        privateContent
        ownerContent
      `;

      // owner(user1) creates a record with only allowed fields
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, user1CreateAllowedSet);
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['id'] = createResult1.data[createResultSetName].id;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      expectNullFields(createResult1.data[createResultSetName], ['privateContent', 'ownerContent']);

      // user1 can update the allowed fields and add user2 to dyamic owners list field
      const todoUpdated1 = {
        id: todo['id'],
        authors: [userName1, userName2],
        privateContent: 'Private Content updated',
      };
      const user1UpdateAllowedSet = `
        id
        owner
        authors
        privateContent
        ownersContent
      `;
      const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, user1UpdateAllowedSet);
      expect(updateResult1.data[updateResultSetName].id).toEqual(todo['id']);
      expect(updateResult1.data[updateResultSetName].owner).toEqual(userName1);
      expect(updateResult1.data[updateResultSetName].authors).toEqual([userName1, userName2]);
      expectNullFields(updateResult1.data[updateResultSetName], ['privateContent', 'ownersContent']);

      // user1 can read the allowed fields
      const user1ReadAllowedSet = `
        id
        owner
        authors
        privateContent
        ownerContent
        ownersContent
      `;
      const getResult1 = await user1TodoHelper.get(
        {
          id: todo['id'],
        },
        user1ReadAllowedSet,
        false,
      );
      checkOperationResult(getResult1, { ...todo, ...todoUpdated1, ownersContent: null }, `get${modelName}`);

      const listTodosResult1 = await user1TodoHelper.list({}, user1ReadAllowedSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['id'], true);

      // user2 can update the private and dynamic owners list protected fields.
      const todoUpdated2 = {
        id: todo['id'],
        owner: todo['owner'],
        authors: [userName2],
        privateContent: 'Private Content updated 1',
        ownersContent: 'Owners Content updated 1',
      };
      const user2UpdateAllowedSet = `
        id
        owner
        authors
        privateContent
        ownersContent
      `;
      const updateResult2 = await user1TodoHelper.update(updateResultSetName, todoUpdated2, user2UpdateAllowedSet);
      expect(updateResult2.data[updateResultSetName].id).toEqual(todo['id']);
      expect(updateResult2.data[updateResultSetName].owner).toEqual(userName1);
      expect(updateResult2.data[updateResultSetName].authors).toEqual([userName2]);
      expectNullFields(updateResult2.data[updateResultSetName], ['privateContent', 'ownersContent']);

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

      const listTodosResult2 = await user2TodoHelper.list({}, user2ReadAllowedSet, `list${modelName}`, false);
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
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, privateContent: null, ownerContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, user1UpdateAllowedSet);
          },
        ],
        {},
        user2UpdateAllowedSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, privateContent: null, ownersContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, user1UpdateAllowedSet, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('Private model auth and restricted field operations', async () => {
      const modelName = 'TodoPrivateContentVarious';
      const user1ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const user2ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todoPrivateFields = {
        owner: userName1,
        authors: [userName1],
        privateContent: 'Private Content',
      };
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;
      const privateResultSet = `
        id
        owner
        authors
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

      // Create a record with allowed fields, so we can test the update and delete operations.
      const user1CreateAllowedSet = `
        ${privateResultSet}
        ownerContent
      `;
      const createResult1 = await user1TodoHelper.create(
        createResultSetName,
        { ...todoPrivateFields, ownerContent: 'Owner Content' },
        user1CreateAllowedSet,
      );
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todoPrivateFields['id'] = createResult1.data[createResultSetName].id;
      // protected fields are nullified in mutation responses
      expectNullFields(createResult1.data[createResultSetName], ['privateContent', 'ownerContent']);

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

      /* todo: enable once fixed in auth utils
      const privateAndOwnersSet = `
        ${privateResultSet}
        ownersContent
      `;
      // non-owner cannot update a record with dynamic owner list protected field
      await expect(async () => await user2TodoHelper.update(updateResultSetName, { ...todoPrivateFields, ownersContent: 'Owners Content'}, privateAndOwnersSet)).rejects.toThrowErrorMatchingInlineSnapshot(
        expectedOperationError(updateResultSetName, 'Mutation'),
      );
      */

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

      /* todo: enable once fixed in auth utils
      // non-owner cannot read owner's records
      const privateAndAllOwnersSet = `
        ${privateResultSet}
        ownerContent
        ownersContent
      `;
      const getResult2 = await user2TodoHelper.get({ id: todoPrivateFields['id'] }, privateAndAllOwnersSet, false, 'all');
      checkOperationResult(getResult2, { ...todoPrivateFields, publicContent: null }, `get${modelName}`, false, expectedFieldErrors(['ownerContent', 'ownersContent'], modelName));

      const listTodosResult2 = await user2TodoHelper.list({}, privateAndAllOwnersSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todoPrivateFields['id'], true);
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(['ownerContent', 'ownersContent'], modelName, false));
      */
    });

    test('Owner model auth and allowed field operations', async () => {
      const modelName = 'TodoOwnerContentVarious';
      const user1ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const user2ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        authors: [userName1],
        privateContent: 'Private Content',
        ownersContent: 'Owners Content',
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
      `;
      const setWithOwnerContent = `
        ${ownerResultSet}
        ownerContent
      `;
      const setWithOwnersContent = `
        ${ownerResultSet}
        ownersContent
      `;
      const completeOwnerResultSet = `
        ${ownerResultSet}
        ownerContent
        ownersContent
      `;

      // owner(user1) creates a record with only allowed fields
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, setWithOwnersContent);
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['id'] = createResult1.data[createResultSetName].id;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      expectNullFields(createResult1.data[createResultSetName], ['privateContent', 'ownersContent']);

      // user1 can update the allowed fields and add user2 to dyamic owners list field
      const todoUpdated1 = {
        id: todo['id'],
        authors: [userName1, userName2],
        privateContent: 'Private Content updated',
        ownerContent: 'Owner Content',
      };
      const updateResult1 = await user1TodoHelper.update(updateResultSetName, todoUpdated1, setWithOwnerContent);
      expect(updateResult1.data[updateResultSetName].id).toEqual(todo['id']);
      expect(updateResult1.data[updateResultSetName].owner).toEqual(userName1);
      expect(updateResult1.data[updateResultSetName].authors).toEqual([userName1, userName2]);
      expectNullFields(updateResult1.data[updateResultSetName], ['privateContent', 'ownerContent']);

      // user1 can read the allowed fields
      const getResult1 = await user1TodoHelper.get(
        {
          id: todo['id'],
        },
        completeOwnerResultSet,
        false,
      );
      checkOperationResult(getResult1, { ...todo, ...todoUpdated1 }, `get${modelName}`);

      const listTodosResult1 = await user1TodoHelper.list({}, completeOwnerResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['id'], true);

      // unless one has delete access to all fields in the model, delete is expected to fail
      await expect(
        async () => await user1TodoHelper.delete(`delete${modelName}`, { id: todo['id'] }, privateResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(`delete${modelName}`, 'Mutation'));

      /* todo: enable once fixed in auth utils
      // user2 can update the private field
      const todoUpdated2 = {
        id: todo['id'],
        privateContent: 'Private Content updated 1',
      };
      const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, privateResultSet);
      expect(updateResult2.data[updateResultSetName].id).toEqual(todo['id']);
      expectNullFields(updateResult2.data[updateResultSetName], ['privateContent']);
      */

      // user2 can read the allowed fields
      const user2ReadAllowedSet = `
        id
        privateContent
        ownersContent
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
          privateContent: todoUpdated1['privateContent'],
          ownersContent: todo['ownersContent'],
        },
        `get${modelName}`,
      );

      const listTodosResult2 = await user2TodoHelper.list({}, user2ReadAllowedSet, `list${modelName}`, false);
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
        { ...todoRandom, privateContent: null, ownersContent: null },
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
        { ...todoRandomUpdated, privateContent: null, ownerContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, setWithOwnersContent, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('Owner model auth with restricted field operations', async () => {
      const modelName = 'TodoOwnerContentVarious';
      const user1ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const user2ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const user1TodoHelper = user1ModelOperationHelpers[modelName];
      const user2TodoHelper = user2ModelOperationHelpers[modelName];

      const todo = {
        authors: [userName1],
        privateContent: 'Private Content',
        ownersContent: 'Owners Content',
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
      `;
      const setWithOwnerContent = `
        ${ownerResultSet}
        ownerContent
      `;
      const setWithOwnersContent = `
        ${ownerResultSet}
        ownersContent
      `;

      /* todo: enable once fixed in auth utils
      // user1 cannot create a record by specifying user2 as the owner
      await expect(async () => await user1TodoHelper.create(createResultSetName, { ...todo, owner: 'user2' })).rejects.toThrowErrorMatchingInlineSnapshot(
        expectedOperationError(createResultSetName, 'Mutation'),
      );
      */

      // user cannot create a record with public protected field
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, publicContent: 'Public Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // user cannot create a record with a field that is protected and does not allow create operation
      await expect(
        async () => await user1TodoHelper.create(createResultSetName, { ...todo, ownerContent: 'Owner Content' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      // Create a record with allowed fields, so we can test the update and delete operations.
      const createResult1 = await user1TodoHelper.create(createResultSetName, todo, setWithOwnersContent);
      expect(createResult1.data[createResultSetName].id).toBeDefined();
      expect(createResult1.data[createResultSetName].owner).toEqual(userName1);
      expect(createResult1.data[createResultSetName].authors).toEqual([userName1]);
      todo['id'] = createResult1.data[createResultSetName].id;
      todo['owner'] = userName1;
      // protected fields are nullified in mutation responses
      expectNullFields(createResult1.data[createResultSetName], ['privateContent', 'ownersContent']);

      const publicFieldSet = `
        id
        publicContent
      `;
      // owner cannot update a record with public protected field
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { id: todo['id'], publicContent: 'Public Content' }, publicFieldSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));

      // owner cannot update a record with a protected field that does not allow update operation
      await expect(
        async () => await user1TodoHelper.update(updateResultSetName, { ...todo, ownersContent: 'Owners Content' }),
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

      // non-owner cannot update a record with an owner protected field
      const ownerContentFieldSet = `
        id
        ownerContent
      `;
      await expect(
        async () => await user2TodoHelper.update(updateResultSetName, { ...todo, ownerContent: 'Owner Content' }, ownerContentFieldSet),
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

      /* todo: enable once fixed in auth utils
      // non-owner cannot read a record with owner protected fields in the selection set
      const ownerReadFieldSet = `
        id
        owner
        authors
        ownerContent
        ownersContent
      `;
      const getResult2 = await user2TodoHelper.get({ id: todo['id'] }, ownerReadFieldSet, false, 'all');
      checkOperationResult(
        getResult2, 
        { id: todo['id'], owner: null, authors: null, ownerContent: null, ownersContent: null }, 
        `get${modelName}`, 
        false, 
        expectedFieldErrors(['owner', 'authors', 'ownerContent', 'ownersContent'], modelName)
      );

      const listTodosResult2 = await user2TodoHelper.list({}, ownerReadFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(['owner', 'authors', 'ownerContent', 'ownersContent'], modelName, false));
      */

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
      };
      const subscriberClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];

      /* todo: enable once fixed in auth utils
      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await user1TodoHelper.create(createResultSetName, todoRandom, setWithOwnersContent);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].id).toEqual(todoRandom.id);
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], ['owner', 'authors', 'privateContent', 'publicContent', 'ownerContent', 'ownersContent']);

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await user1TodoHelper.update(`update${modelName}`, todoRandomUpdated, setWithOwnerContent);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].id).toEqual(todoRandom.id);
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], ['owner', 'authors', 'privateContent', 'publicContent', 'ownerContent', 'ownersContent']);
      */
      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', []);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('Custom owner model auth and allowed field operations', async () => {
      const modelName = 'TodoCustomOwnerContentVarious';
      const user1ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const user2ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
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

      const listTodosResult1 = await user1TodoHelper.list({}, completeOwnerResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult1, `list${modelName}`, todo['customId'], true, 'customId');

      /* todo: enable once fixed in auth utils

      // user2 can update the private field
      const todoUpdated2 = {
        customId: todo['customId'],
        privateContent: 'Private Content updated 1',
      };
      const updateResult2 = await user2TodoHelper.update(updateResultSetName, todoUpdated2, privateResultSet);
      expect(updateResult2.data[updateResultSetName].customId).toEqual(todo['customId']);
      expectNullFields(updateResult2.data[updateResultSetName], ['privateContent']);
      */

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
          privateContent: todoUpdated1['privateContent'],
        },
        `get${modelName}`,
      );

      const listTodosResult2 = await user2TodoHelper.list({}, privateResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');

      /* todo: enable once fixed in auth utils
      // user1 can delete the record
      const deleteResult1 = await user1TodoHelper.delete(deleteResultSetName, { customId: todo['customId'] }, completeOwnerResultSet);
      checkOperationResult(deleteResult1, { ...todo, ...todoUpdated1, privateContent: null, ownerContent: null }, deleteResultSetName);
      */

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

      /* todo: enable once fixed in auth utils
      const onDeleteSubscriptionResult = await subTodoHelper.subscribe(
        'onDelete', 
        [
          async () => {
            await user1TodoHelper.delete(deleteResultSetName, { customId: todoRandom.customId }, completeOwnerResultSet);
          },
        ], 
        {}, 
        completeOwnerResultSet,
        false
      );
      expect(onDeleteSubscriptionResult).toHaveLength(1);
      checkOperationResult(onDeleteSubscriptionResult[0], {...todoRandomUpdated, privateContent: null, ownerContent: null}, `onDelete${modelName}`);
      */
    });

    test('Custom owner model auth and restricted field operations', async () => {
      const modelName = 'TodoCustomOwnerContentVarious';
      const user1ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const user2ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
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

      /* todo: enable once fixed in auth utils
      // user1 cannot create a record by specifying user2 as the owner
      await expect(async () => await user1TodoHelper.create(createResultSetName, { ...todo, author: 'user2' }, completeOwnerResultSet)).rejects.toThrowErrorMatchingInlineSnapshot(
        expectedOperationError(createResultSetName, 'Mutation'),
      );
      */

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

      /* todo: enable once fixed in auth utils
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
        expectedFieldErrors(['author', 'ownerContent'], modelName)
      );

      const listTodosResult2 = await user2TodoHelper.list({}, ownerReadFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(['author', 'ownerContent'], modelName, false));
      */

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

      /* todo: enable once fixed in auth utils
      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate', [
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
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], ['author', 'privateContent', 'publicContent', 'ownerContent']);

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
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], ['author', 'privateContent', 'publicContent', 'ownerContent']);

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [
        async () => {
          await user1TodoHelper.delete(deleteResultSetName, { customId: todo['customId'] }, completeOwnerResultSet);
        },
      ]);
      expect(onDeleteSubscriptionResult).toHaveLength(1);
      expect(onDeleteSubscriptionResult[0].data[`onDelete${modelName}`].customId).toEqual(todoRandom.customId);
      expectNullFields(onDeleteSubscriptionResult[0].data[`onDelete${modelName}`], ['author', 'privateContent', 'publicContent', 'ownerContent']);
      */
    });

    test('Custom list of owners model auth and allowed field operations', async () => {
      const modelName = 'TodoCustomOwnersContentVarious';
      const user1ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const user2ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
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

      const listTodosResult1 = await user1TodoHelper.list({}, completeOwnerResultSet, `list${modelName}`, false);
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

      const listTodosResult2 = await user2TodoHelper.list({}, privateResultSet, `list${modelName}`, false);
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
      const user1ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const user2ModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
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

      /* todo: enable once fixed in auth utils
      // user1 cannot create a record by specifying user2 as the only owner
      await expect(async () => await user1TodoHelper.create(createResultSetName, { ...todo, authors: [userName2] }, completeOwnerResultSet)).rejects.toThrowErrorMatchingInlineSnapshot(
        expectedOperationError(createResultSetName, 'Mutation'),
      );
      */

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

      /* todo: enable once fixed in auth utils
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
        expectedFieldErrors(['authors', 'ownersContent'], modelName)
      );

      const listTodosResult2 = await user2TodoHelper.list({}, ownerReadFieldSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult2, `list${modelName}`, todo['customId'], true, 'customId');
      checkListResponseErrors(listTodosResult2, expectedFieldErrors(['authors', 'ownersContent'], modelName, false));
      */

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

      /* todo: enable once fixed in auth utils
      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate', [
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
      expectNullFields(onCreateSubscriptionResult[0].data[`onCreate${modelName}`], ['authors', 'privateContent', 'ownersContent']);

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
      expectNullFields(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`], ['authors', 'privateContent', 'ownersContent']);
      */
    });

    test.skip('non-admin users can perform CRUD and subscription operations with only private fields in selection set', async () => {
      const modelName = 'TodoAdminContentVarious';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todoWithPrivateFields = {
        privateContent: 'PrivateContent',
      };
      const privateResultSet = `
        id
        privateContent
      `;
      const createResultSetName = `create${modelName}`;

      // admin is able to create a record with only private fields
      const createResult = await todoHelperNonAdmin.create(createResultSetName, todoWithPrivateFields, privateResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todoWithPrivateFields['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();

      const todoUpdated = {
        id: todoWithPrivateFields['id'],
        privateContent: 'Private Content updated',
      };

      const updateResult = await todoHelperNonAdmin.update(`update${modelName}`, todoUpdated, privateResultSet);
      expect(updateResult.data[`update${modelName}`].id).toEqual(todoWithPrivateFields['id']);
      expect(updateResult.data[`update${modelName}`].privateContent).toBeNull();

      const getResult = await todoHelperNonAdmin.get(
        {
          id: todoWithPrivateFields['id'],
        },
        privateResultSet,
        false,
      );
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await todoHelperNonAdmin.list({}, privateResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult, `list${modelName}`, todoWithPrivateFields['id'], true);

      // unless all fields have same Auth rules as the model, delete is expected to fail
      await expect(
        async () => await todoHelperNonAdmin.delete(`delete${modelName}`, { id: todoWithPrivateFields['id'] }, privateResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access delete${modelName} on type Mutation"`);

      const todoRandom = {
        ...todoWithPrivateFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithPrivateFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await todoHelperAdmin.create(createResultSetName, todoRandom, privateResultSet);
          },
        ],
        {},
        privateResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].id).toEqual(todoRandom.id);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].privateContent).toBeNull();

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await todoHelperAdmin.update(`update${modelName}`, todoRandomUpdated, privateResultSet);
          },
        ],
        {},
        privateResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].id).toEqual(todoRandom.id);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].privateContent).toBeNull();

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, privateResultSet, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test.skip('admin users cannot perform CRUD and subscription operations on public protected field', async () => {
      const modelName = 'TodoAdminContentVarious';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todoWithPrivateFields = {
        privateContent: 'PrivateContent',
      };
      const todo = {
        ...todoWithPrivateFields,
        publicContent: 'PublicContent',
      };
      const completeResultSet = `
        id
        privateContent
        publicContent
      `;
      const createResultSetName = `create${modelName}`;

      await expect(async () => await todoHelper.create(createResultSetName, todo)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access create${modelName} on type Mutation"`,
      );

      // Create a record with only allowed fields, so we can test the update and delete operations.
      const privateResultSet = `
        id
        privateContent
      `;
      const createResult = await todoHelper.create(createResultSetName, todoWithPrivateFields, privateResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;

      const todoUpdated = {
        id: todo['id'],
        privateContent: 'Private Content updated',
        publicContent: 'Public Content updated',
      };

      await expect(async () => await todoHelper.update(`update${modelName}`, todoUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access update${modelName} on type Mutation"`,
      );

      const expectedFieldError = `"GraphQL error: Not Authorized to access publicContent on type ${modelName}"`;
      const getResult = await todoHelper.get({ id: todo['id'] }, undefined, true, 'all');
      checkOperationResult(getResult, { ...todo, publicContent: null }, `get${modelName}`, false, [expectedFieldError]);

      const listTodosResult = await todoHelper.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult, [`Not Authorized to access publicContent on type ${modelName}`]);

      const todoRandom = {
        ...todoWithPrivateFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithPrivateFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(createResultSetName, todoRandom, privateResultSet);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, publicContent: null, privateContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await subTodoHelper.update(`update${modelName}`, todoRandomUpdated, privateResultSet);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, publicContent: null, privateContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', []);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test.skip('user not part of allowed custom group of a record can perform CRUD and subscription operations with only allowed fields in selection set', async () => {
      const modelName = 'TodoCustomGroupContentVarious';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todoWithAllowedFields = {
        privateContent: 'PrivateContent',
        customGroup: adminGroupName,
      };
      const allowedResultSet = `
        id
        customGroup
        privateContent
      `;
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;

      // admin is able to create a record with only private fields
      const createResult = await todoHelperAdmin.create(createResultSetName, todoWithAllowedFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todoWithAllowedFields['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].customGroup).toBeNull();

      const todoUpdated = {
        ...todoWithAllowedFields,
        privateContent: 'Private Content updated',
      };

      // non-admin can update the private protected field
      const updateResult = await todoHelperNonAdmin.update(updateResultSetName, todoUpdated, allowedResultSet);
      checkOperationResult(updateResult, { ...todoUpdated, customGroup: null, privateContent: null }, updateResultSetName);

      // non-admin can read the private protected field
      const getResult = await todoHelperNonAdmin.get(
        {
          id: todoWithAllowedFields['id'],
        },
        allowedResultSet,
        false,
      );
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await todoHelperNonAdmin.list({}, allowedResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult, `list${modelName}`, todoWithAllowedFields['id'], true);

      // unless all fields have same Auth rules as the model, delete is expected to fail
      await expect(
        async () => await todoHelperNonAdmin.delete(`delete${modelName}`, { id: todoWithAllowedFields['id'] }, allowedResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access delete${modelName} on type Mutation"`);

      const todoRandom = {
        ...todoWithAllowedFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithAllowedFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await todoHelperAdmin.create(createResultSetName, todoRandom, allowedResultSet);
          },
        ],
        {},
        allowedResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, customGroup: null, privateContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await todoHelperAdmin.update(`update${modelName}`, todoRandomUpdated, allowedResultSet);
          },
        ],
        {},
        allowedResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandomUpdated, customGroup: null, privateContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, allowedResultSet, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test.skip('user part of allowed custom group of a record cannot perform CRUD operations on public protected field', async () => {
      const modelName = 'TodoCustomGroupContentVarious';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todoWithAllowedFields = {
        privateContent: 'PrivateContent',
        customGroup: adminGroupName,
      };
      const todo = {
        ...todoWithAllowedFields,
        publicContent: 'PublicContent',
      };
      const completeResultSet = `
        id
        customGroup
        privateContent
        publicContent
      `;
      const createResultSetName = `create${modelName}`;

      await expect(async () => await todoHelperAdmin.create(createResultSetName, todo)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access create${modelName} on type Mutation"`,
      );

      // Create a record with allowed fields only, so we can test the update and delete operations.
      const allowedResultSet = `
        id
        customGroup
        privateContent
      `;
      const createResult = await todoHelperAdmin.create(createResultSetName, todoWithAllowedFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].customGroup).toBeNull();

      const todoUpdated = {
        ...todo,
        privateContent: 'Private Content updated',
        publicContent: 'Public Content updated',
      };

      await expect(async () => await todoHelperAdmin.update(`update${modelName}`, todoUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access update${modelName} on type Mutation"`,
      );

      const expectedFieldError = `"GraphQL error: Not Authorized to access publicContent on type ${modelName}"`;
      const getResult = await todoHelperAdmin.get({ id: todo['id'] }, undefined, true, 'all');
      checkOperationResult(getResult, { ...todo, publicContent: null }, `get${modelName}`, false, [expectedFieldError]);

      const listTodosResult = await todoHelperAdmin.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult, [`Not Authorized to access publicContent on type ${modelName}`]);
    });

    test.skip('user not part of group in allowed custom groups list of a record can perform CRUD and subscription operations with only allowed fields in selection set', async () => {
      const modelName = 'TodoCustomGroupsContentVarious';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todoWithAllowedFields = {
        privateContent: 'PrivateContent',
        customGroups: [adminGroupName],
      };
      const allowedResultSet = `
        id
        customGroups
        privateContent
      `;
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;

      // admin is able to create a record with only private fields
      const createResult = await todoHelperAdmin.create(createResultSetName, todoWithAllowedFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todoWithAllowedFields['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].customGroups).toBeNull();

      const todoUpdated = {
        ...todoWithAllowedFields,
        privateContent: 'Private Content updated',
      };

      // non-admin can update the private protected field
      const updateResult = await todoHelperNonAdmin.update(updateResultSetName, todoUpdated, allowedResultSet);
      checkOperationResult(updateResult, { ...todoUpdated, customGroups: null, privateContent: null }, updateResultSetName);

      // non-admin can read the private protected field
      const getResult = await todoHelperNonAdmin.get(
        {
          id: todoWithAllowedFields['id'],
        },
        allowedResultSet,
        false,
      );
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await todoHelperNonAdmin.list({}, allowedResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult, `list${modelName}`, todoWithAllowedFields['id'], true);

      // unless all fields have same Auth rules as the model, delete is expected to fail
      await expect(
        async () => await todoHelperNonAdmin.delete(`delete${modelName}`, { id: todoWithAllowedFields['id'] }, allowedResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access delete${modelName} on type Mutation"`);

      const todoRandom = {
        ...todoWithAllowedFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithAllowedFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await todoHelperAdmin.create(createResultSetName, todoRandom, allowedResultSet);
          },
        ],
        {},
        allowedResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, customGroups: null, privateContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await todoHelperAdmin.update(`update${modelName}`, todoRandomUpdated, allowedResultSet);
          },
        ],
        {},
        allowedResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandomUpdated, customGroups: null, privateContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, allowedResultSet, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test.skip('user part of group in allowed custom groups list of a record cannot perform CRUD operations on public protected field', async () => {
      const modelName = 'TodoCustomGroupsContentVarious';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todoWithAllowedFields = {
        privateContent: 'PrivateContent',
        customGroups: [adminGroupName],
      };
      const todo = {
        ...todoWithAllowedFields,
        publicContent: 'PublicContent',
      };
      const completeResultSet = `
        id
        customGroups
        privateContent
        publicContent
      `;
      const createResultSetName = `create${modelName}`;

      await expect(async () => await todoHelperAdmin.create(createResultSetName, todo)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access create${modelName} on type Mutation"`,
      );

      // Create a record with allowed fields only, so we can test the update and delete operations.
      const allowedResultSet = `
        id
        customGroups
        privateContent
      `;
      const createResult = await todoHelperAdmin.create(createResultSetName, todoWithAllowedFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].customGroups).toBeNull();

      const todoUpdated = {
        ...todo,
        privateContent: 'Private Content updated',
        publicContent: 'Public Content updated',
      };

      await expect(async () => await todoHelperAdmin.update(`update${modelName}`, todoUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access update${modelName} on type Mutation"`,
      );

      const expectedFieldError = `"GraphQL error: Not Authorized to access publicContent on type ${modelName}"`;
      const getResult = await todoHelperAdmin.get({ id: todo['id'] }, undefined, true, 'all');
      checkOperationResult(getResult, { ...todo, publicContent: null }, `get${modelName}`, false, [expectedFieldError]);

      const listTodosResult = await todoHelperAdmin.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult, [`Not Authorized to access publicContent on type ${modelName}`]);
    });
  });
};
