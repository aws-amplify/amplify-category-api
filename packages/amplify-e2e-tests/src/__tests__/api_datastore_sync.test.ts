/* eslint-disable */
import {
  addApiWithBlankSchemaAndConflictDetection,
  amplifyPush,
  amplifyPushUpdate,
  apiDisableDataStore,
  createNewProjectDir,
  deleteProject,
  deleteProjectDir,
  enableAdminUI,
  getAppSyncApi,
  getLocalEnvInfo,
  getProjectMeta,
  getTransformConfig,
  initJSProjectWithProfile,
  updateApiSchema,
  updateAPIWithResolutionStrategyWithModels,
} from 'amplify-category-api-e2e-core';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { existsSync } from 'fs';
import gql from 'graphql-tag';
import { TRANSFORM_CURRENT_VERSION } from 'graphql-transformer-core';
import _ from 'lodash';
import * as path from 'path';

const providerName = 'awscloudformation';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');
// to deal with subscriptions in node env
(global as any).WebSocket = require('ws');

describe('amplify add api (GraphQL)', () => {
  let projRoot: string;
  let appSyncClient;
  beforeAll(async () => {
    projRoot = await createNewProjectDir('graphql-api');

    const name = 'datastoresynctest';
    await initJSProjectWithProfile(projRoot, { name });
    await addApiWithBlankSchemaAndConflictDetection(projRoot, { transformerVersion: 2 });
    await updateApiSchema(projRoot, name, 'datastore-sync.graphql');
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);
    const region = meta.providers[providerName].Region as string;
    const { output } = meta.api[name];
    const url = output.GraphQLAPIEndpointOutput as string;
    const apiKey = output.GraphQLAPIKeyOutput as string;

    appSyncClient = new AWSAppSyncClient({
      url,
      region,
      disableOffline: true,
      auth: {
        type: AUTH_TYPE.API_KEY,
        apiKey,
      },
    });

  });

  afterAll(async () => {
    const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projRoot);
    }
    deleteProjectDir(projRoot);
  });

  it('sync works with no default id primary key', async () => {
    const createPerson = /* GraphQL */ `
      mutation CreatePerson($input: CreatePersonInput!, $condition: ModelPersonConditionInput) {
        createPerson(input: $input, condition: $condition) {
          id
          firstName
          lastName
          _version
          _deleted
          _lastChangedAt
        }
      }
    `;

    const syncPeople = /* GraphQL */ `
      query SyncPeople($lastSync: AWSTimestamp, $filter: ModelPersonFilterInput) {
        syncPeople(lastSync: $lastSync, filter: $filter) {
          items {
            id
            firstName
            lastName
            _version
            _deleted
            _lastChangedAt
          }
        }
      }
    `;

    let createPersonResult: any = await appSyncClient.mutate({
      mutation: gql(createPerson),
      fetchPolicy: 'no-cache',
      variables: {
        input: {
          firstName: 'NameA',
          lastName: 'NameB',
        }
      },
    });

    let createPersonResultData = createPersonResult.data.createPerson;
    expect(createPersonResultData).toBeDefined();
    
    
    createPersonResult = await appSyncClient.mutate({
      mutation: gql(createPerson),
      fetchPolicy: 'no-cache',
      variables: {
        input: {
          firstName: 'NameX',
          lastName: 'NameY',
        }
      },
    });

    createPersonResultData = createPersonResult.data.createPerson;
    expect(createPersonResultData).toBeDefined();
    
    const lastSync = createPersonResultData._lastChangedAt;

    const syncPeopleResult = await appSyncClient.query({
      query: gql(syncPeople),
      fetchPolicy: 'no-cache',
      variables: {
        lastSync
      }
    });
    const syncPeopleResultItems = (syncPeopleResult.data as any).syncPeople.items;
    expect(syncPeopleResultItems).toBeDefined();
    expect(syncPeopleResultItems).toHaveLength(1);
    expect(syncPeopleResultItems[0].firstName).toEqual('NameX');
    expect(syncPeopleResultItems[0].lastName).toEqual('NameY');
  });

  it('sync works with custom primary key', async () => {
    const createTodo = /* GraphQL */ `
      mutation CreateTodo($input: CreateTodoInput!, $condition: ModelTodoConditionInput) {
        createTodo(input: $input, condition: $condition) {
          aTodoId
          seqNo
          name
          description
          _version
          _deleted
          _lastChangedAt
        }
      }
    `;

    const syncTodos = /* GraphQL */ `
      query SyncTodos($lastSync: AWSTimestamp, $filter: ModelTodoFilterInput) {
        syncTodos(lastSync: $lastSync, filter: $filter) {
          items {
            aTodoId
            seqNo
            name
            description
            _version
            _deleted
            _lastChangedAt
          }
        }
      }
    `;

    let createTodoResult: any = await appSyncClient.mutate({
      mutation: gql(createTodo),
      fetchPolicy: 'no-cache',
      variables: {
        input: {
          aTodoId: 'A1',
          seqNo: 1,
          name: 'Todo-A1-1',
          description: 'Desc-A1-1',
        }
      },
    });

    let createTodoResultData = createTodoResult.data.createTodo;
    expect(createTodoResultData).toBeDefined();
    
    createTodoResult = await appSyncClient.mutate({
      mutation: gql(createTodo),
      fetchPolicy: 'no-cache',
      variables: {
        input: {
          aTodoId: 'A1',
          seqNo: 2,
          name: 'Todo-A1-2',
          description: 'Desc-A1-2',
        }
      },
    });

    createTodoResultData = createTodoResult.data.createTodo;
    expect(createTodoResultData).toBeDefined();
    
    const lastSync = createTodoResultData._lastChangedAt;

    // Checking if sync without filter on partition key works
    let syncTodosResult = await appSyncClient.query({
      query: gql(syncTodos),
      fetchPolicy: 'no-cache',
      variables: {
        lastSync
      }
    });

    let syncTodosResultItems = (syncTodosResult.data as any).syncTodos.items;
    expect(syncTodosResultItems).toBeDefined();
    expect(syncTodosResultItems).toHaveLength(1);
    expect(syncTodosResultItems[0].name).toEqual('Todo-A1-2');
    expect(syncTodosResultItems[0].description).toEqual('Desc-A1-2');

    createTodoResult = await appSyncClient.mutate({
      mutation: gql(createTodo),
      fetchPolicy: 'no-cache',
      variables: {
        input: {
          aTodoId: 'A2',
          seqNo: 1,
          name: 'Todo-A2-1',
          description: 'Desc-A2-1',
        }
      },
    });

    // Checking if sync with filter on partition key works
    syncTodosResult = await appSyncClient.query({
      query: gql(syncTodos),
      fetchPolicy: 'no-cache',
      variables: {
        lastSync,
        filter: {
          aTodoId: {
            eq: 'A2',
          }
        }
      }
    });
    syncTodosResultItems = (syncTodosResult.data as any).syncTodos.items;
    expect(syncTodosResultItems).toBeDefined();
    expect(syncTodosResultItems).toHaveLength(1);
    expect(syncTodosResultItems[0].name).toEqual('Todo-A2-1');
    expect(syncTodosResultItems[0].description).toEqual('Desc-A2-1');
  });
});
