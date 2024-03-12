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
} from 'amplify-category-api-e2e-core';
import { existsSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import { configureAmplify, getConfiguredAppsyncClientIAMAuth, getConfiguredAppsyncClientLambdaAuth } from '../schema-api-directives';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';
import { getDefaultDatabasePort } from '../rds-v2-test-utils';
import { API, Auth } from 'aws-amplify';
import gql from 'graphql-tag';
import { withTimeOut } from '../utils/api';
import { GRAPHQL_AUTH_MODE } from '@aws-amplify/api';
import { Observable, ZenObservable } from 'zen-observable-ts';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

// delay times
const SUBSCRIPTION_DELAY = 10000;
const SUBSCRIPTION_TIMEOUT = 10000;

export const testRdsLambdaAuthorizerFieldAuth = (engine: ImportedRDSType, queries: string[]): void => {
  describe('RDS Lambda Authorizer field auth', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'us-east-1'; // This get overwritten in beforeAll
    let port = getDefaultDatabasePort(engine);
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const engineSuffix = engine === ImportedRDSType.MYSQL ? 'mysql' : 'pg';
    const engineName = engine === ImportedRDSType.MYSQL ? 'mysql' : 'postgres';
    const projName = `${engineSuffix}modelauth2`;
    const apiName = projName;

    let projRoot;
    let person1LambdaAuthClient, person2LambdaAuthClient, person3LambdaAuthClient;
    let person1IAMPublicClient, person2IAMPublicClient, person3IAMPublicClient;
    let apiEndPoint;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projName);
      await initProjectAndImportSchema();
      await amplifyPush(projRoot, false, {
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });
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

      await createAppSyncClients(apiEndPoint, appRegion);
    });

    const createAppSyncClients = async (apiEndPoint, appRegion): Promise<void> => {
      configureAmplify(projRoot);
      const unAuthCredentials = await Auth.currentCredentials();

      const unauthAppSyncClient = getConfiguredAppsyncClientIAMAuth(apiEndPoint, appRegion, unAuthCredentials);
      const lambdaAuthClient = getConfiguredAppsyncClientLambdaAuth(apiEndPoint, appRegion, 'custom-authorized');
      person1LambdaAuthClient = constructModelHelper('Person1', lambdaAuthClient);
      person2LambdaAuthClient = constructModelHelper('Person2', lambdaAuthClient);
      person3LambdaAuthClient = constructModelHelper('Person3', lambdaAuthClient);
      person1IAMPublicClient = constructModelHelper('Person1', unauthAppSyncClient);
      person2IAMPublicClient = constructModelHelper('Person2', unauthAppSyncClient);
      person3IAMPublicClient = constructModelHelper('Person3', unauthAppSyncClient);
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

      const db = await setupRDSInstanceAndData(dbConfig, queries);
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

      const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');

      await addApiWithAllAuthModes(projRoot, { transformerVersion: 2, apiName });

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

      const schema = /* GraphQL */ `
        input AMPLIFY {
          engine: String = "${engineName}"
        }

        # Lambda Authorizer can't delete a record
        # Lambda Authorizer can't update SSN field
        # Lambda Authorizer can't read SSN field 
        # Lambda Authorizer can create a record with all fields, but can't read SSN response
        # Lambda Authorizer subscription can't read SSN field
        type Person1 @model @auth(rules: [{allow: custom, provider: function}, {allow: public, provider: iam}]) {
          id: Int! @primaryKey
          firstName: String
          lastName: String
          ssn: String @auth(rules: [{allow: public, provider: iam}, {allow: custom, provider: function, operations: [create]}])
        }

        # Lambda Authorizer can't create a record with SSN value
        # Lambda Authorizer can create a record without a SSN value
        # Lambda Authorizer can't update a record with SSN value
        # Lambda Authorizer can't delete a record
        type Person2 @model @auth(rules: [{allow: custom, provider: function}, {allow: public, provider: iam}]) {
          id: Int! @primaryKey
          firstName: String
          lastName: String
          ssn: String @auth(rules: [{allow: public, provider: iam}, {allow: custom, provider: function, operations: [read]}])
        }

        # Lambda Authorizer can't create a record with SSN value
        # Lambda Authorizer can delete a record
        type Person3 @model @auth(rules: [{allow: custom, provider: function}, {allow: public, provider: iam}]) {
          id: Int! @primaryKey
          firstName: String
          lastName: String
          ssn: String @auth(rules: [{allow: public, provider: iam}, {allow: custom, provider: function, operations: [delete]}])
        }
      `;
      writeFileSync(rdsSchemaFilePath, schema, 'utf8');

      // Enable unauthenticated access to the Cognito resource and push again
      await enableUserPoolUnauthenticatedAccess(projRoot);
    };

    const selectionSetWithoutSSN = `
      id
      firstName
      lastName
    `;

    const getQueryWithoutSSN = (name: string): string => /* GraphQL */ `
      query Get${name}($id: Int!) {
        get${name}(id: $id) {
          ${selectionSetWithoutSSN}
        }
      }
    `;

    const listQueryWithoutSSN = (name: string): string => /* GraphQL */ `
      query List${name}s {
        list${name}s {
          items {
            ${selectionSetWithoutSSN}
          }
        }
      }
    `;

    test('Model Person1 - Lambda Authorizer can create a record with all fields, but SSN response is null', async () => {
      const person = {
        id: 1,
        firstName: 'Person1',
        lastName: 'Person1',
        ssn: '123-45-6789',
      };
      // Lambda Authorizer can create the record with all fields. But the API throws unauthorized error for the SSN field.
      // We will run a get query to verify that the record was created with all the fields including SSN.
      await expect(person1LambdaAuthClient.create('createPerson1', person)).rejects.toThrow(
        'GraphQL error: Not Authorized to access ssn on type Person1',
      );

      const person1Response = await person1IAMPublicClient.get({ id: person.id });
      expect(person1Response.data.getPerson1.id).toEqual(person.id);
      expect(person1Response.data.getPerson1.firstName).toEqual(person.firstName);
      expect(person1Response.data.getPerson1.lastName).toEqual(person.lastName);
      expect(person1Response.data.getPerson1.ssn).toEqual(person.ssn);
    });

    test('Model Person1 - Lambda Authorizer cannot read SSN field on GET query', async () => {
      const person = {
        id: 1,
        firstName: 'Person1',
        lastName: 'Person1',
      };
      await expect(person1LambdaAuthClient.get({ id: person.id })).rejects.toThrow(
        'GraphQL error: Not Authorized to access ssn on type Person1',
      );

      const person1Response = await person1LambdaAuthClient.get({ id: person.id }, getQueryWithoutSSN('Person1'));
      expect(person1Response.data.getPerson1.id).toEqual(person.id);
      expect(person1Response.data.getPerson1.firstName).toEqual(person.firstName);
      expect(person1Response.data.getPerson1.lastName).toEqual(person.lastName);
    });

    test('Model Person1 - Lambda Authorizer cannot read SSN field on LIST query', async () => {
      const person = {
        id: 1,
        firstName: 'Person1',
        lastName: 'Person1',
      };
      await expect(person1LambdaAuthClient.list()).rejects.toThrow('GraphQL error: Not Authorized to access ssn on type Person1');

      const listPerson1Response = await person1LambdaAuthClient.list(undefined, listQueryWithoutSSN('Person1'));
      expect(listPerson1Response.data.listPerson1s).toBeDefined();
      expect(listPerson1Response.data.listPerson1s.items).toBeDefined();
      expect(listPerson1Response.data.listPerson1s.items).toHaveLength(1);
      expect(listPerson1Response.data.listPerson1s.items[0].id).toEqual(person.id);
      expect(listPerson1Response.data.listPerson1s.items[0].firstName).toEqual(person.firstName);
      expect(listPerson1Response.data.listPerson1s.items[0].lastName).toEqual(person.lastName);
    });

    test('Model Person1 - Lambda Authorizer cannot update SSN', async () => {
      const currentSSN = '123-45-6789';
      const person = {
        id: 1,
        firstName: 'Person1',
        lastName: 'Person1',
        ssn: '999-99-9999',
      };
      await expect(person1LambdaAuthClient.update('updatePerson1', person)).rejects.toThrow(
        'GraphQL error: Not Authorized to access updatePerson1 on type Mutation',
      );

      const person1Response = await person1IAMPublicClient.get({ id: person.id });
      expect(person1Response.data.getPerson1.id).toEqual(person.id);
      expect(person1Response.data.getPerson1.firstName).toEqual(person.firstName);
      expect(person1Response.data.getPerson1.lastName).toEqual(person.lastName);
      expect(person1Response.data.getPerson1.ssn).toEqual(currentSSN);
    });

    test('Model Person1 - Lambda Authorizer can update without SSN', async () => {
      const person = {
        id: 1,
        firstName: 'Person1-Updated',
        lastName: 'Person1-Updated',
      };

      const person1UpdateResponse = await person1LambdaAuthClient.update('updatePerson1', person, selectionSetWithoutSSN);
      expect(person1UpdateResponse.data.updatePerson1.id).toEqual(person.id);
      expect(person1UpdateResponse.data.updatePerson1.firstName).toEqual(person.firstName);
      expect(person1UpdateResponse.data.updatePerson1.lastName).toEqual(person.lastName);

      const person1Response = await person1IAMPublicClient.get({ id: person.id });
      expect(person1Response.data.getPerson1.id).toEqual(person.id);
      expect(person1Response.data.getPerson1.firstName).toEqual(person.firstName);
      expect(person1Response.data.getPerson1.lastName).toEqual(person.lastName);
    });

    test('Model Person1 - Lambda Authorizer cannot delete a record', async () => {
      const person = {
        id: 1,
      };
      await expect(person1LambdaAuthClient.delete('deletePerson1', person)).rejects.toThrow(
        'GraphQL error: Not Authorized to access deletePerson1 on type Mutation',
      );
    });

    test('Model Person1 - SSN field must be redacted on subscriptions', async () => {
      const personRecord = {
        id: 2,
        firstName: 'Person2',
        lastName: 'Person2',
        ssn: '111-11-1111',
      };

      // Check onCreate subscription
      const observer = API.graphql({
        query: gql`
          subscription OnCreatePerson1 {
            onCreatePerson1 {
              id
              firstName
              lastName
              ssn
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AWS_LAMBDA,
        authToken: 'custom-authorized',
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const person = event.value.data.onCreatePerson1;
            subscription.unsubscribe();
            expect(person).toBeDefined();
            expect(person).toEqual(
              expect.objectContaining({
                id: personRecord.id,
                firstName: personRecord.firstName,
                lastName: personRecord.lastName,
                ssn: null,
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('Lambda Authorizer client should be able to subscribe on Person1');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await person1IAMPublicClient.create('createPerson1', personRecord);

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'onCreatePerson1 Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    test('Model Person2 - Lambda Authorizer cannot create a record with SSN value', async () => {
      const person = {
        id: 1,
        firstName: 'Person1',
        lastName: 'Person1',
        ssn: '123-45-6789',
      };
      await expect(person2LambdaAuthClient.create('createPerson2', person)).rejects.toThrow(
        'GraphQL error: Not Authorized to access createPerson2 on type Mutation',
      );

      const personResponse = await person2IAMPublicClient.get({ id: person.id });
      expect(personResponse.data.getPerson2).toBeNull();
    });

    test('Model Person2 - Lambda Authorizer can create a record without SSN value', async () => {
      const person = {
        id: 1,
        firstName: 'Person1',
        lastName: 'Person1',
      };
      const personCreateResponse = await person2LambdaAuthClient.create('createPerson2', person, selectionSetWithoutSSN);
      expect(personCreateResponse.data.createPerson2.id).toEqual(person.id);
      expect(personCreateResponse.data.createPerson2.firstName).toEqual(person.firstName);
      expect(personCreateResponse.data.createPerson2.lastName).toEqual(person.lastName);
    });

    test('Model Person2 - Lambda Authorizer cannot update a record including SSN', async () => {
      const person = {
        id: 1,
        firstName: 'Person1',
        lastName: 'Person1',
        ssn: '999-99-9999',
      };
      await expect(person2LambdaAuthClient.update('updatePerson2', person)).rejects.toThrow(
        'GraphQL error: Not Authorized to access updatePerson2 on type Mutation',
      );
    });

    test('Model Person2 - Lambda Authorizer cannot delete a record', async () => {
      const person = {
        id: 1,
      };
      await expect(person2LambdaAuthClient.delete('deletePerson2', person)).rejects.toThrow(
        'GraphQL error: Not Authorized to access deletePerson2 on type Mutation',
      );
    });

    test('Model Person2 - SSN field must be readable on subscriptions', async () => {
      const personRecord = {
        id: 2,
        firstName: 'Person2',
        lastName: 'Person2',
        ssn: '111-11-1111',
      };

      // Check onCreate subscription
      const observer = API.graphql({
        query: gql`
          subscription OnCreatePerson2 {
            onCreatePerson2 {
              id
              firstName
              lastName
              ssn
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AWS_LAMBDA,
        authToken: 'custom-authorized',
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const person = event.value.data.onCreatePerson2;
            subscription.unsubscribe();
            expect(person).toBeDefined();
            expect(person).toEqual(
              expect.objectContaining({
                id: personRecord.id,
                firstName: personRecord.firstName,
                lastName: personRecord.lastName,
                ssn: personRecord.ssn,
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('Lambda Authorizer client should be able to subscribe on Person2');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await person2IAMPublicClient.create('createPerson2', personRecord);

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'onCreatePerson2 Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    test('Model Person3 - Lambda Authorizer cannot create a record with SSN value', async () => {
      const person = {
        id: 1,
        firstName: 'Person1',
        lastName: 'Person1',
        ssn: '123-45-6789',
      };
      await expect(person3LambdaAuthClient.create('createPerson3', person)).rejects.toThrow(
        'GraphQL error: Not Authorized to access createPerson3 on type Mutation',
      );

      const personResponse = await person3IAMPublicClient.get({ id: person.id });
      expect(personResponse.data.getPerson3).toBeNull();
    });

    test('Model Person3 - Lambda Authorizer can delete a record', async () => {
      const person = {
        id: 1,
        firstName: 'Person1',
        lastName: 'Person1',
        ssn: '123-45-6789',
      };
      const personCreateResponse = await person3IAMPublicClient.create('createPerson3', person);
      expect(personCreateResponse.data.createPerson3.id).toEqual(person.id);
      expect(personCreateResponse.data.createPerson3.firstName).toEqual(person.firstName);
      expect(personCreateResponse.data.createPerson3.lastName).toEqual(person.lastName);
      expect(personCreateResponse.data.createPerson3.ssn).toBeNull(); // SSN is null because of subscription field redactions

      // Lambda Authorizer can delete a record. It will throw unauthorized error for SSN field. The record will still be deleted.
      await expect(person3LambdaAuthClient.delete('deletePerson3', { id: person.id })).rejects.toThrow(
        'GraphQL error: Not Authorized to access ssn on type Person3',
      );

      const person3GetResponse = await person3IAMPublicClient.get({ id: person.id });
      expect(person3GetResponse.data.getPerson3).toBeNull();
    });

    test('Model Person3 - SSN field must be redacted on subscriptions', async () => {
      const personRecord = {
        id: 2,
        firstName: 'Person2',
        lastName: 'Person2',
        ssn: '111-11-1111',
      };

      // Check onCreate subscription
      const observer = API.graphql({
        query: gql`
          subscription OnCreatePerson3 {
            onCreatePerson3 {
              id
              firstName
              lastName
              ssn
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AWS_LAMBDA,
        authToken: 'custom-authorized',
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const person = event.value.data.onCreatePerson3;
            subscription.unsubscribe();
            expect(person).toBeDefined();
            expect(person).toEqual(
              expect.objectContaining({
                id: personRecord.id,
                firstName: personRecord.firstName,
                lastName: personRecord.lastName,
                ssn: null,
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('Lambda Authorizer client should be able to subscribe on Person3');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await person3IAMPublicClient.create('createPerson3', personRecord);

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'onCreatePerson3 Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    const constructModelHelper = (name: string, client): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
        id
        firstName
        lastName
        ssn
      `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query Get${name}($id: Int!) {
          get${name}(id: $id) {
            id
            firstName
            lastName
            ssn
          }
        }
      `;
      const listSelectionSet = /* GraphQL */ `
        query List${name}s {
          list${name}s {
            items {
              id
              firstName
              lastName
              ssn
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
