import {
  addApiWithoutSchema,
  amplifyPush,
  createNewProjectDir,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  getAppSyncApi,
  getProjectMeta,
  importRDSDatabase,
  initJSProjectWithProfile,
  sleep,
  setupRDSInstanceAndData,
} from 'amplify-category-api-e2e-core';
import { existsSync, readFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import path from 'path';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import pluralize from 'pluralize';
import { GQLQueryHelper } from '../query-utils/gql-helper';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Model Directive', () => {
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  let region = 'us-east-1';
  let port = 3306;
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;
  const projName = 'rdsmodelapitest';

  let projRoot;
  let appSyncClient;

  beforeAll(async () => {
    projRoot = await createNewProjectDir('rdsmodelapi');
    await initProjectAndImportSchema();
    await amplifyPush(projRoot);
    await sleep(1 * 60 * 1000); // Wait for 1 minute(s) for the VPC endpoints to be live.

    await verifyApiEndpointAndCreateClient();
  });

  const verifyApiEndpointAndCreateClient = async (): Promise<void> => {
    const meta = getProjectMeta(projRoot);
    const appRegion = meta.providers.awscloudformation.Region;
    const { output } = meta.api.rdsapi;
    const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, appRegion);

    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);

    const apiEndPoint = GraphQLAPIEndpointOutput as string;
    const apiKey = GraphQLAPIKeyOutput as string;

    appSyncClient = new AWSAppSyncClient({
      url: apiEndPoint,
      region,
      disableOffline: true,
      auth: {
        type: AUTH_TYPE.API_KEY,
        apiKey,
      },
    });
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
      engine: 'mysql' as const,
      dbname: database,
      username,
      password,
      region,
    };
    const queries = [
      'CREATE TABLE Contact (id VARCHAR(40) PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50))',
      'CREATE TABLE Person (personId INT PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50))',
      'CREATE TABLE Employee (id INT PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50))',
      'CREATE TABLE Student (studentId INT NOT NULL, classId CHAR(1) NOT NULL, firstName VARCHAR(20), lastName VARCHAR(50), PRIMARY KEY (studentId, classId))',
    ];

    const db = await setupRDSInstanceAndData(dbConfig, queries);
    port = db.port;
    host = db.endpoint;
  };

  const cleanupDatabase = async (): Promise<void> => {
    await deleteDBInstance(identifier, region);
  };

  const initProjectAndImportSchema = async (): Promise<void> => {
    const apiName = 'rdsapi';
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
      name: projName,
    });

    const metaAfterInit = getProjectMeta(projRoot);
    region = metaAfterInit.providers.awscloudformation.Region;
    await setupDatabase();

    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.rds.graphql');

    await addApiWithoutSchema(projRoot, { transformerVersion: 2, apiName });

    await importRDSDatabase(projRoot, {
      database,
      host,
      port,
      username,
      password,
      useVpc: true,
      apiExists: true,
    });

    const schemaContent = readFileSync(rdsSchemaFilePath, 'utf8');
    const schema = parse(schemaContent);

    // Generated schema should contains the types and fields from the database
    const contactObjectType = schema.definitions.find(
      (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Contact',
    ) as ObjectTypeDefinitionNode;
    const personObjectType = schema.definitions.find((d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Person');
    const employeeObjectType = schema.definitions.find((d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Employee');

    expect(contactObjectType).toBeDefined();
    expect(personObjectType).toBeDefined();
    expect(employeeObjectType).toBeDefined();
  };
});

const constructContactHelper = (): ((appSyncClient) => GQLQueryHelper) => {
  const name = 'Contact';
  const defaultSelectionSet = /* GraphQL */ `
        id
        firstName
        lastName
      `;
  const createSelectionSet = defaultSelectionSet;
  const updateSelectionSet = defaultSelectionSet;
  const deleteSelectionSet = defaultSelectionSet;
  const getSelectionSet = /* GraphQL */ `
    query Get${name}($id: String!) {
      get${name}(id: $id) {
        ${defaultSelectionSet}
      }
    }
  `;
  const listSelectionSet = /* GraphQL */ `
    query List${pluralize(name)} {
      list${name}s {
        items {
          ${defaultSelectionSet}
        }
      }
    }
  `;
  const helper = (appSyncClient): GQLQueryHelper =>
    new GQLQueryHelper(appSyncClient, name, {
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

const constructPersonHelper = (): ((appSyncClient) => GQLQueryHelper) => {
  const name = 'Person';
  const defaultSelectionSet = /* GraphQL */ `
        personId
        firstName
        lastName
      `;
  const createSelectionSet = defaultSelectionSet;
  const updateSelectionSet = defaultSelectionSet;
  const deleteSelectionSet = defaultSelectionSet;
  const getSelectionSet = /* GraphQL */ `
    query Get${name}($id: String!) {
      get${name}(id: $id) {
        ${defaultSelectionSet}
      }
    }
  `;
  const listSelectionSet = /* GraphQL */ `
    query List${pluralize(name)} {
      list${name}s {
        items {
          ${defaultSelectionSet}
        }
      }
    }
  `;
  const helper = (appSyncClient): GQLQueryHelper =>
    new GQLQueryHelper(appSyncClient, name, {
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
