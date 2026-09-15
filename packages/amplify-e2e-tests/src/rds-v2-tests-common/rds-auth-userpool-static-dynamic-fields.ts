import {
  addApiWithAllAuthModes,
  amplifyPush,
  createNewProjectDir,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  enableUserPoolUnauthenticatedAccess,
  getAppSyncApi,
  getProjectMeta,
  importRDSDatabase,
  initJSProjectWithProfile,
  setupRDSInstanceAndData,
  sleep,
  updateAuthAddUserGroups,
} from 'amplify-category-api-e2e-core';
import { existsSync, removeSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import { configureAmplify, getConfiguredAppsyncClientCognitoAuth, getUserPoolId, setupUser, signInUser } from '../schema-api-directives';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';
import {
  appendAmplifyInputWithoutGlobalAuthRule,
  checkListItemExistence,
  checkListResponseErrors,
  checkOperationResult,
  configureAppSyncClients,
  createModelOperationHelpers,
  expectNullFields,
  expectedFieldErrors,
  expectedOperationError,
  getDefaultDatabasePort,
  omit,
} from '../rds-v2-test-utils';
import { schema, sqlCreateStatements } from '../__tests__/auth-test-schemas/userpool-static-dynamic-fields';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

export const testRdsUserpoolStaticAndDynamicFieldAuth = (engine: ImportedRDSType, queries: string[]): void => {
  describe('RDS userpool static & dynamic field auth', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'us-east-1'; // This get overwritten in beforeAll
    let port = getDefaultDatabasePort(engine);
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const engineSuffix = engine === ImportedRDSType.MYSQL ? 'ms' : 'pg';
    const engineName = engine === ImportedRDSType.MYSQL ? 'mysql' : 'postgres';
    const projName = `${engineSuffix}multifieldauth2`;
    const apiName = projName;

    const modelName = 'Employee';
    const createResultSetName = `create${modelName}`;
    const updateResultSetName = `update${modelName}`;
    const deleteResultSetName = `delete${modelName}`;
    const getResultSetName = `get${modelName}`;
    const listResultSetName = `list${modelName}s`;
    const onCreateResultSetName = `onCreate${modelName}`;
    const onUpdateResultSetName = `onUpdate${modelName}`;
    const onDeleteResultSetName = `onDelete${modelName}`;

    const userName1 = 'user1'; // Admin
    const userName2 = 'user2'; // BuildTime
    const userName3 = 'user3'; // RunTime
    const userName4 = 'user4'; // BuildTime & RunTime
    const adminGroupName = 'Admin';
    const buildTimeGroupName = 'BuildTime';
    const runTimeGroupName = 'RunTime';
    const userPassword = 'user@Password';
    const userPoolProvider = 'userPools';
    const userMap = {};

    let projRoot;
    let apiEndPoint;
    let appSyncClients = {};
    let userpoolAppSyncClients;
    let employeeUser1Client: GQLQueryHelper,
      employeeUser2Client: GQLQueryHelper,
      employeeUser3Client: GQLQueryHelper,
      employeeUser4Client: GQLQueryHelper;
    let employeeUser2, employeeUser3, employeeUser4;
    beforeAll(async () => {
      projRoot = await createNewProjectDir(projName);
      await initProjectAndImportSchema();
      await sleep(2 * 60 * 1000); // Wait for 2 minutes for the VPC endpoints to be live.

      const meta = getProjectMeta(projRoot);
      const appRegion = meta.providers.awscloudformation.Region;
      const { output } = meta.api[apiName];
      const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
      apiEndPoint = GraphQLAPIEndpointOutput as string;

      const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, appRegion);

      expect(GraphQLAPIIdOutput).toBeDefined();
      expect(GraphQLAPIEndpointOutput).toBeDefined();
      expect(GraphQLAPIKeyOutput).toBeDefined();

      expect(graphqlApi).toBeDefined();
      expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);

      await createAppSyncClients();
      await setupInitialEntries();
    });

    const createAppSyncClients = async (): Promise<void> => {
      const userPoolId = getUserPoolId(projRoot);
      configureAmplify(projRoot);

      // cognito userpool clients
      await setupUser(userPoolId, userName1, userPassword, adminGroupName);
      await setupUser(userPoolId, userName2, userPassword, buildTimeGroupName);
      await setupUser(userPoolId, userName3, userPassword, runTimeGroupName);
      await setupUser(userPoolId, userName4, userPassword, [buildTimeGroupName, runTimeGroupName]);
      const user1 = await signInUser(userName1, userPassword);
      userMap[userName1] = user1;
      const user2 = await signInUser(userName2, userPassword);
      userMap[userName2] = user2;
      const user3 = await signInUser(userName3, userPassword);
      userMap[userName3] = user3;
      const user4 = await signInUser(userName4, userPassword);
      userMap[userName4] = user4;
      appSyncClients = await configureAppSyncClients(projRoot, apiName, [userPoolProvider], userMap);
      userpoolAppSyncClients = appSyncClients[userPoolProvider];

      employeeUser1Client = constructModelHelper(modelName, userpoolAppSyncClients[userName1]);
      employeeUser2Client = constructModelHelper(modelName, userpoolAppSyncClients[userName2]);
      employeeUser3Client = constructModelHelper(modelName, userpoolAppSyncClients[userName3]);
      employeeUser4Client = constructModelHelper(modelName, userpoolAppSyncClients[userName4]);
    };

    const setupInitialEntries = async (): Promise<void> => {
      // Set up employees for tests
      employeeUser2 = {
        id: 'E-2',
        bio: 'Bio2',
        notes: 'My note 2',
        email: userName2,
        accolades: ['Good Job!'],
        salary: 1000,
        team: [buildTimeGroupName],
      };
      employeeUser3 = {
        id: 'E-3',
        bio: 'Bio3',
        notes: 'My note 3',
        email: userName3,
        accolades: ['Well Done!'],
        salary: 2000,
        team: [runTimeGroupName],
      };
      employeeUser4 = {
        id: 'E-4',
        bio: 'Bio4',
        notes: 'My note 4',
        email: userName4,
        accolades: ['Awesome!'],
        salary: 3000,
        team: [buildTimeGroupName, runTimeGroupName],
      };
      await employeeUser1Client.create(createResultSetName, employeeUser2);
      await employeeUser1Client.create(createResultSetName, employeeUser3);
      await employeeUser1Client.create(createResultSetName, employeeUser4);
    };

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
      };

      const db = await setupRDSInstanceAndData(dbConfig, sqlCreateStatements(engine));
      port = db.port;
      host = db.endpoint;
    };

    const cleanupDatabase = async (): Promise<void> => {
      await deleteDBInstance(identifier, region);
    };

    const initProjectAndImportSchema = async (): Promise<void> => {
      await initJSProjectWithProfile(projRoot, {
        disableAmplifyAppCreation: false,
        name: projName,
      });

      const metaAfterInit = getProjectMeta(projRoot);
      region = metaAfterInit.providers.awscloudformation.Region;
      await setupDatabase();
      await addApiWithAllAuthModes(projRoot, { transformerVersion: 2, apiName });
      // Remove DDB schema
      const ddbSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.graphql');
      removeSync(ddbSchemaFilePath);
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
      // Write RDS schema
      const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
      const rdsSchema = appendAmplifyInputWithoutGlobalAuthRule(schema, engine);
      writeFileSync(rdsSchemaFilePath, rdsSchema, 'utf8');
      // Enable unauthenticated access to the Cognito resource and push again
      await enableUserPoolUnauthenticatedAccess(projRoot);
      await updateAuthAddUserGroups(projRoot, [adminGroupName, buildTimeGroupName, runTimeGroupName], { useSocialProvider: true });
      await amplifyPush(projRoot, false, {
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });
      // Make a dummy edit for schema and re-push
      // This is a known bug in which deploying the userpool auth with sql schema cannot be done within one push
      writeFileSync(rdsSchemaFilePath, `${rdsSchema}\n`, 'utf8');
      await amplifyPush(projRoot, false, {
        skipCodegen: true,
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });
    };

    describe('Admin user can perform all valid operations on employee', () => {
      const employee = {
        id: 'E-1',
        bio: 'Bio1',
        notes: 'My note 1',
        email: userName1,
        accolades: ['You did it!'],
        salary: 1000,
        team: [buildTimeGroupName, runTimeGroupName],
      };
      const updatedEmployee = {
        id: employee.id,
        bio: 'Bio1 updated',
        notes: 'My note 1 updated',
        email: userName1,
        accolades: ['You did it!', 'Thank you!'],
        salary: 2000,
        team: [buildTimeGroupName],
      };
      describe('Admin group user can create an employee', () => {
        let createEmployeeResult;
        test('should create the employee successfully', async () => {
          createEmployeeResult = await employeeUser1Client.create(createResultSetName, employee);
          expect(createEmployeeResult.data[createResultSetName]).toEqual(
            expect.objectContaining(omit(employee, 'notes', 'salary', 'team')),
          );
        });
        test('notes, team and salary are protected and cannot be read upon mutation', () => {
          expect(createEmployeeResult.data[createResultSetName].notes).toBeNull();
          expect(createEmployeeResult.data[createResultSetName].salary).toBeNull();
          expect(createEmployeeResult.data[createResultSetName].team).toBeNull();
        });
      });
      test('Admin group user can read all fields', async () => {
        const getEmployeeResult = await employeeUser1Client.get({
          id: employee.id,
        });
        expect(getEmployeeResult.data[getResultSetName]).toEqual(expect.objectContaining(employee));
        const listEmployeesResult = await employeeUser1Client.list();
        expect(listEmployeesResult.data[listResultSetName].items).toEqual(expect.arrayContaining([expect.objectContaining(employee)]));
      });
      describe('Admin group user can update all fields', () => {
        let updateEmployeeResult;
        test('should update the employee successfully', async () => {
          updateEmployeeResult = await employeeUser1Client.update(updateResultSetName, updatedEmployee);
          expect(updateEmployeeResult.data[updateResultSetName]).toEqual(
            expect.objectContaining(omit(updatedEmployee, 'notes', 'salary', 'team')),
          );
        });
        test('notes, team and salary fields are protected and cannot be read upon mutation', () => {
          expect(updateEmployeeResult.data[updateResultSetName].notes).toBeNull();
          expect(updateEmployeeResult.data[updateResultSetName].salary).toBeNull();
          expect(updateEmployeeResult.data[updateResultSetName].team).toBeNull();
        });
      });
      // unless one has delete access to all fields in the model, delete is expected to fail
      describe('Admin user can delete the employee', () => {
        let deleteEmployeeResult;
        test('should delete the employee successfully', async () => {
          deleteEmployeeResult = await employeeUser1Client.delete(deleteResultSetName, { id: employee.id });
          expect(deleteEmployeeResult.data[deleteResultSetName]).toEqual(
            expect.objectContaining(omit(updatedEmployee, 'notes', 'salary', 'team')),
          );
        });
        test('notes, team and salary fields are protected and cannot be read upon deletion', () => {
          expect(deleteEmployeeResult.data[deleteResultSetName].notes).toBeNull();
          expect(deleteEmployeeResult.data[deleteResultSetName].salary).toBeNull();
          expect(deleteEmployeeResult.data[deleteResultSetName].team).toBeNull();
        });
      });
    });
    describe('Admin user can subscribe all updates on employee', () => {
      const employee = {
        id: 'E-1-sub',
        bio: 'Bio1 sub',
        notes: 'My note 1 sub',
        email: userName2,
        accolades: ['You did it!'],
        salary: 1000,
        team: [buildTimeGroupName, runTimeGroupName],
      };
      const updatedEmployee = {
        id: employee.id,
        bio: 'Bio1 updated',
        notes: 'My note 1 updated',
        email: userName2,
        accolades: ['You did it!', 'Thank you!'],
        salary: 2000,
        team: [buildTimeGroupName],
      };
      // Setup admin user client for subscription (user1)
      let subEmployeeHelper;
      test('Should setup a client for subscriber', () => {
        const subscriberClient = getConfiguredAppsyncClientCognitoAuth(apiEndPoint, region, userMap[userName1]);
        subEmployeeHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];
      });
      test('Can listen to the create event', async () => {
        const onCreateSubscriptionResult = await subEmployeeHelper.subscribe(
          'onCreate',
          [
            async () => {
              await employeeUser1Client.create(createResultSetName, employee);
            },
          ],
          {},
        );
        expect(onCreateSubscriptionResult).toHaveLength(1);
        expect(onCreateSubscriptionResult[0].data[onCreateResultSetName]).toEqual(
          expect.objectContaining(omit(employee, 'notes', 'salary', 'team')),
        );
        expectNullFields(onCreateSubscriptionResult[0].data[onCreateResultSetName], ['notes', 'salary', 'team']);
      });
      test('Can listen to the update event', async () => {
        const onUpdateSubscriptionResult = await subEmployeeHelper.subscribe(
          'onUpdate',
          [
            async () => {
              await employeeUser1Client.update(updateResultSetName, updatedEmployee);
            },
          ],
          {},
        );
        expect(onUpdateSubscriptionResult).toHaveLength(1);
        expect(onUpdateSubscriptionResult[0].data[onUpdateResultSetName]).toEqual(
          expect.objectContaining(omit(updatedEmployee, 'notes', 'salary', 'team')),
        );
        expectNullFields(onUpdateSubscriptionResult[0].data[onUpdateResultSetName], ['notes', 'salary', 'team']);
      });
      test('Can listen to the delete event', async () => {
        const onDeleteSubscriptionResult = await subEmployeeHelper.subscribe(
          'onDelete',
          [
            async () => {
              await employeeUser1Client.delete(deleteResultSetName, { id: updatedEmployee.id });
            },
          ],
          {},
        );
        expect(onDeleteSubscriptionResult).toHaveLength(1);
        expect(onDeleteSubscriptionResult[0].data[onDeleteResultSetName]).toEqual(
          expect.objectContaining(omit(updatedEmployee, 'notes', 'salary', 'team')),
        );
        expectNullFields(onDeleteSubscriptionResult[0].data[onDeleteResultSetName], ['notes', 'salary', 'team']);
      });
    });
    describe('Non-admin group users can perform all valid operations on employee', () => {
      test('User not in Admin group cannot create or delete the employee even if the owner field is himself', async () => {
        await expect(
          async () =>
            await employeeUser2Client.create(createResultSetName, {
              id: 'invalid2',
              email: userName2,
              team: [buildTimeGroupName],
            }),
        ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));
        await expect(
          async () =>
            await employeeUser2Client.delete(deleteResultSetName, {
              id: employeeUser2.id,
            }),
        ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(deleteResultSetName, 'Mutation'));
      });
      test('User can read all fields of its own record', async () => {
        const getEmployeeResult1 = await employeeUser2Client.get({
          id: employeeUser2.id,
        });
        expect(getEmployeeResult1.data[getResultSetName]).toEqual(expect.objectContaining(employeeUser2));
      });
      test('User cannot read team notes of those he is not a member and cannot read salary info of others', async () => {
        const getEmployeeResult2 = await employeeUser2Client.get(
          {
            id: employeeUser3.id,
          },
          undefined,
          true,
          'all',
        );
        checkOperationResult(
          getEmployeeResult2,
          { ...employeeUser3, notes: null, salary: null },
          getResultSetName,
          false,
          expectedFieldErrors(['notes', 'salary'], 'Employee'),
        );
        const listEmployeesResult = await employeeUser2Client.list({}, undefined, listResultSetName, true, 'all');
        checkListItemExistence(listEmployeesResult, listResultSetName, employeeUser3.id, true);
        checkListResponseErrors(listEmployeesResult, expectedFieldErrors(['notes', 'salary'], 'Employee', false));
      });
      describe('User can update fields of bio, notes and accolades of their own', () => {
        let updateEmployeeResult1;
        const updatedEmployee1 = {
          id: 'E-2',
          bio: 'Bio2 updated',
          notes: 'My note 2 updated',
          accolades: ['Good Job!', 'Cool!'],
          team: [buildTimeGroupName],
          salary: 1000,
          email: userName2,
        };
        test('should update the restricted fields successfully', async () => {
          updateEmployeeResult1 = await employeeUser2Client.update(updateResultSetName, omit(updatedEmployee1, 'team', 'salary', 'email'));
          expect(updateEmployeeResult1.data[updateResultSetName]).toEqual(
            expect.objectContaining(omit(updatedEmployee1, 'notes', 'salary', 'team')),
          );
        });
        test('notes, team and salary fields are protected and cannot be read upon mutation', () => {
          expect(updateEmployeeResult1.data[updateResultSetName].notes).toBeNull();
          expect(updateEmployeeResult1.data[updateResultSetName].salary).toBeNull();
          expect(updateEmployeeResult1.data[updateResultSetName].team).toBeNull();
        });
      });
      describe('User can update accolades for their teammates', () => {
        let updateEmployeeResult2;
        const updatedEmployee2 = {
          id: 'E-4',
          bio: 'Bio4',
          notes: 'My note 4',
          email: userName4,
          accolades: ['Awesome!', 'He has ownership'],
          salary: 3000,
          team: [buildTimeGroupName, runTimeGroupName],
        };
        test('should update the employee successfully', async () => {
          updateEmployeeResult2 = await employeeUser2Client.update(
            updateResultSetName,
            { id: updatedEmployee2.id, accolades: updatedEmployee2.accolades },
            `
              id
              bio
              notes
              email
              team
              accolades
            `,
          );
          expect(updateEmployeeResult2.data[updateResultSetName]).toEqual(
            expect.objectContaining(omit(updatedEmployee2, 'notes', 'salary', 'team')),
          );
        });
        test('notes field is protected and cannot be read upon mutation', () => {
          expect(updateEmployeeResult2.data[updateResultSetName].notes).toBeNull();
        });
      });
      test('User cannot update bio or notes if they are not owner', async () => {
        await expect(
          async () => await employeeUser2Client.update(updateResultSetName, { id: employeeUser3.id, bio: 'invalid bio' }),
        ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));
        await expect(
          async () => await employeeUser2Client.update(updateResultSetName, { id: employeeUser3.id, notes: 'invalid notes' }),
        ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));
      });
      test('User cannot update accolades for an employee from a non-overlapping team', async () => {
        await expect(
          async () =>
            await employeeUser2Client.update(updateResultSetName, {
              id: employeeUser3.id,
              accolades: [...employeeUser3.accolades, 'Best employee!'],
            }),
        ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));
      });
      test('User cannot update any of the fields left', () => {
        const forbiddenFields = {
          team: [runTimeGroupName],
          email: userName1,
          salary: 10000,
        };
        Object.entries(forbiddenFields).forEach(async (entry) => {
          const updateInput = Object.fromEntries([['id', employeeUser2.id], entry]);
          await expect(
            async () => await employeeUser2Client.update(updateResultSetName, updateInput),
          ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));
        });
      });
    });
    describe('Non-admin user can subscribe all updates on employee except for restricted fields', () => {
      const employee = {
        id: 'E-2-sub',
        bio: 'Bio2 sub',
        notes: 'My note 2 sub',
        email: userName3,
        accolades: ['You did it!'],
        salary: 1000,
        team: [buildTimeGroupName, runTimeGroupName],
      };
      const updatedEmployee = {
        id: employee.id,
        bio: 'Bio1 updated',
        notes: 'My note 1 updated',
        email: userName2,
        accolades: ['You did it!', 'Thank you!'],
        salary: 2000,
        team: [buildTimeGroupName],
      };
      // Setup non-admin user client for subscription (user2)
      let subEmployeeHelper;
      test('Should setup a client for subscriber', () => {
        const subscriberClient = getConfiguredAppsyncClientCognitoAuth(apiEndPoint, region, userMap[userName2]);
        subEmployeeHelper = createModelOperationHelpers(subscriberClient, schema)[modelName];
      });
      test('Can listen to the create event', async () => {
        const onCreateSubscriptionResult = await subEmployeeHelper.subscribe(
          'onCreate',
          [
            async () => {
              await employeeUser1Client.create(createResultSetName, employee);
            },
          ],
          {},
        );
        expect(onCreateSubscriptionResult).toHaveLength(1);
        expect(onCreateSubscriptionResult[0].data[onCreateResultSetName]).toEqual(
          expect.objectContaining(omit(employee, 'notes', 'salary', 'team')),
        );
        expectNullFields(onCreateSubscriptionResult[0].data[onCreateResultSetName], ['notes', 'salary', 'team']);
      });
      test('Can listen to the update event', async () => {
        const onUpdateSubscriptionResult = await subEmployeeHelper.subscribe(
          'onUpdate',
          [
            async () => {
              await employeeUser1Client.update(updateResultSetName, updatedEmployee);
            },
          ],
          {},
        );
        expect(onUpdateSubscriptionResult).toHaveLength(1);
        expect(onUpdateSubscriptionResult[0].data[onUpdateResultSetName]).toEqual(
          expect.objectContaining(omit(updatedEmployee, 'notes', 'salary', 'team')),
        );
        expectNullFields(onUpdateSubscriptionResult[0].data[onUpdateResultSetName], ['notes', 'salary', 'team']);
      });
      test('Can listen to the delete event', async () => {
        const onDeleteSubscriptionResult = await subEmployeeHelper.subscribe(
          'onDelete',
          [
            async () => {
              await employeeUser1Client.delete(deleteResultSetName, { id: updatedEmployee.id });
            },
          ],
          {},
        );
        expect(onDeleteSubscriptionResult).toHaveLength(1);
        expect(onDeleteSubscriptionResult[0].data[onDeleteResultSetName]).toEqual(
          expect.objectContaining(omit(updatedEmployee, 'notes', 'salary', 'team')),
        );
        expectNullFields(onDeleteSubscriptionResult[0].data[onDeleteResultSetName], ['notes', 'salary', 'team']);
      });
    });

    // helper functions
    const constructModelHelper = (name: string, client): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
        id
        bio
        notes
        email
        salary
        team
        accolades
      `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query Get${name}($id: ID!) {
          get${name}(id: $id) {
            id
            bio
            notes
            email
            salary
            team
            accolades
          }
        }
      `;
      const listSelectionSet = /* GraphQL */ `
        query List${name}s {
          list${name}s {
            items {
              id
              bio
              notes
              email
              salary
              team
              accolades
            }
          }
        }
      `;
      const helper = new GQLQueryHelper(client, name, {
        mutation: {
          create: createSelectionSet,
          update: updateSelectionSet,
          delete: deleteSelectionSet,
        },
        query: {
          get: getSelectionSet,
          list: listSelectionSet,
        },
      });

      return helper;
    };
  });
};
