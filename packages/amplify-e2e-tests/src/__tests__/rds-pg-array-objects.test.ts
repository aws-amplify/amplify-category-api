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
  getResource,
  sleep,
  setupRDSInstanceAndData,
  updateSchema,
} from 'amplify-category-api-e2e-core';
import { existsSync, readFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse, print } from 'graphql';
import path from 'path';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import gql from 'graphql-tag';
import { getDefaultStrategyNameForDbType, getResourceNamesForStrategyName, normalizeDbType } from '@aws-amplify/graphql-transformer-core';
import { ModelDataSourceStrategySqlDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { SQL_TESTS_USE_BETA } from '../rds-v2-tests-common/sql-e2e-config';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

const CDK_FUNCTION_TYPE = 'AWS::Lambda::Function';
const CDK_VPC_ENDPOINT_TYPE = 'AWS::EC2::VPCEndpoint';

const engine = 'postgres';
const strategyName = getDefaultStrategyNameForDbType(normalizeDbType(engine) as ModelDataSourceStrategySqlDbType);
const resourceNames = getResourceNamesForStrategyName(strategyName);

describe('RDS Model Directive', () => {
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  let region = 'us-east-1';
  let port = 5432;
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;
  const projName = 'rdsmodelapitest';
  const apiName = 'rdsapi';

  let projRoot;
  let appSyncClient;

  beforeAll(async () => {
    projRoot = await createNewProjectDir('rdsmodelapi');
    await initProjectAndImportSchema();
    modifySchema();
    await amplifyPush(projRoot, false, {
      useBetaSqlLayer: SQL_TESTS_USE_BETA,
    });
    await sleep(2 * 60 * 1000); // Wait for 2 minutes for the VPC endpoints to be live.

    await verifyApiEndpointAndCreateClient();
    verifySQLLambdaIsInVpc();
  });

  const modifySchema = (): void => {
    const updatedSchema = gql`
      input AMPLIFY {
        engine: String = "postgres"
        globalAuthRule: AuthRule = { allow: public }
      }

      type Contact @refersTo(name: "contact") @model {
        id: Int! @primaryKey
        firstname: String
        lastname: String
        tags: [String]
        address: ContactAddress
      }

      type ContactAddress {
        city: String!
        state: String!
        street: String!
        zip: String!
      }
    `;
    updateSchema(projRoot, apiName, print(updatedSchema), 'schema.sql.graphql');
  };

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

  const verifySQLLambdaIsInVpc = (): void => {
    // Validate the generated resources in the CloudFormation template
    const apisDirectory = path.join(projRoot, 'amplify', 'backend', 'api');
    const apiDirectory = path.join(apisDirectory, 'rdsapi');
    const cfnRDSTemplateFile = path.join(apiDirectory, 'build', 'stacks', `${resourceNames.sqlStack}.json`);
    const cfnTemplate = JSON.parse(readFileSync(cfnRDSTemplateFile, 'utf8'));
    expect(cfnTemplate.Resources).toBeDefined();
    const resources = cfnTemplate.Resources;

    // Validate if the SQL lambda function has VPC configuration even if the database is accessible through internet
    const rdsLambdaFunction = getResource(resources, resourceNames.sqlLambdaFunction, CDK_FUNCTION_TYPE);
    expect(rdsLambdaFunction).toBeDefined();
    expect(rdsLambdaFunction.Properties).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig.SubnetIds).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig.SubnetIds.length).toBeGreaterThan(0);
    expect(rdsLambdaFunction.Properties.VpcConfig.SecurityGroupIds).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig.SecurityGroupIds.length).toBeGreaterThan(0);

    expect(getResource(resources, `${resourceNames.sqlVpcEndpointPrefix}ssm`, CDK_VPC_ENDPOINT_TYPE)).toBeDefined();
    expect(getResource(resources, `${resourceNames.sqlVpcEndpointPrefix}ssmmessages`, CDK_VPC_ENDPOINT_TYPE)).toBeDefined();
    expect(getResource(resources, `${resourceNames.sqlVpcEndpointPrefix}kms`, CDK_VPC_ENDPOINT_TYPE)).toBeDefined();
    expect(getResource(resources, `${resourceNames.sqlVpcEndpointPrefix}ec2`, CDK_VPC_ENDPOINT_TYPE)).toBeDefined();
    expect(getResource(resources, `${resourceNames.sqlVpcEndpointPrefix}ec2messages`, CDK_VPC_ENDPOINT_TYPE)).toBeDefined();
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
      engine: 'postgres' as const,
      dbname: database,
      username,
      password,
      region,
    };

    const queries = [
      'CREATE TABLE Contact (id INT PRIMARY KEY, firstname VARCHAR(20), lastname VARCHAR(50), tags VARCHAR[], address JSON)',
    ];

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

    await addApiWithoutSchema(projRoot, { transformerVersion: 2, apiName });

    await importRDSDatabase(projRoot, {
      database,
      engine: 'postgres',
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

    expect(contactObjectType).toBeDefined();

    // Verify the fields in the generated schema on type 'Contacts'
    const contactsIdFieldType = contactObjectType.fields.find((f) => f.name.value === 'id');
    const contactsFirstNameFieldType = contactObjectType.fields.find((f) => f.name.value === 'firstname');
    const contactsLastNameFieldType = contactObjectType.fields.find((f) => f.name.value === 'lastname');

    expect(contactsIdFieldType).toBeDefined();
    expect(contactsFirstNameFieldType).toBeDefined();
    expect(contactsLastNameFieldType).toBeDefined();

    // PrimaryKey directive must be defined on Id field.
    expect(contactsIdFieldType.directives.find((d) => d.name.value === 'primaryKey')).toBeDefined();
  };

  test('check CRUDL on contact table with array and objects', async () => {
    const contact1 = await createContact('David', 'Smith', 1, ['tag1', 'tag2'], {
      city: 'Seattle',
      state: 'WA',
      street: '123 Main St',
      zip: '98115',
    });
    const contact2 = await createContact('Chris', 'Sundersingh', 2, ['tag3', 'tag4'], {
      city: 'Seattle',
      state: 'WA',
      street: '456 Another St',
      zip: '98119',
    });

    expect(contact1.data.createContact.id).toBeDefined();
    expect(contact1.data.createContact.firstname).toEqual('David');
    expect(contact1.data.createContact.lastname).toEqual('Smith');
    expect(contact1.data.createContact.tags).toEqual(expect.arrayContaining(['tag1', 'tag2']));
    expect(contact1.data.createContact.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '123 Main St',
        zip: '98115',
      }),
    );

    expect(contact2.data.createContact.id).toBeDefined();
    expect(contact2.data.createContact.firstname).toEqual('Chris');
    expect(contact2.data.createContact.lastname).toEqual('Sundersingh');
    expect(contact2.data.createContact.tags).toEqual(expect.arrayContaining(['tag3', 'tag4']));
    expect(contact2.data.createContact.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '456 Another St',
        zip: '98119',
      }),
    );

    const getContact1 = await getContact(contact1.data.createContact.id);
    expect(getContact1.data.getContact.id).toEqual(contact1.data.createContact.id);
    expect(getContact1.data.getContact.firstname).toEqual('David');
    expect(getContact1.data.getContact.lastname).toEqual('Smith');
    expect(getContact1.data.getContact.tags).toEqual(expect.arrayContaining(['tag1', 'tag2']));
    expect(getContact1.data.getContact.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '123 Main St',
        zip: '98115',
      }),
    );

    const contact1Updated = await updateContact(contact1.data.createContact.id, 'David', 'Jones', ['tag1', 'tag2', 'tag3'], {
      city: 'Seattle',
      state: 'WA',
      street: '12345 Main St',
      zip: '98110',
    });
    expect(contact1Updated.data.updateContact.id).toEqual(contact1.data.createContact.id);
    expect(contact1Updated.data.updateContact.firstname).toEqual('David');
    expect(contact1Updated.data.updateContact.lastname).toEqual('Jones');
    expect(contact1Updated.data.updateContact.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
    expect(contact1Updated.data.updateContact.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '12345 Main St',
        zip: '98110',
      }),
    );

    const getContact1Updated = await getContact(contact1.data.createContact.id);
    expect(getContact1Updated.data.getContact.id).toEqual(contact1.data.createContact.id);
    expect(getContact1Updated.data.getContact.firstname).toEqual('David');
    expect(getContact1Updated.data.getContact.lastname).toEqual('Jones');
    expect(getContact1Updated.data.getContact.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
    expect(getContact1Updated.data.getContact.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '12345 Main St',
        zip: '98110',
      }),
    );

    const listContactsResult = await listContacts();
    expect(listContactsResult.data.listContacts.items.length).toEqual(2);
    expect(listContactsResult.data.listContacts.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: contact1.data.createContact.id,
          firstname: 'David',
          lastname: 'Jones',
          tags: expect.arrayContaining(['tag1', 'tag2', 'tag3']),
          address: expect.objectContaining({
            city: 'Seattle',
            state: 'WA',
            street: '12345 Main St',
            zip: '98110',
          }),
        }),
        expect.objectContaining({
          id: contact2.data.createContact.id,
          firstname: 'Chris',
          lastname: 'Sundersingh',
          tags: expect.arrayContaining(['tag3', 'tag4']),
          address: expect.objectContaining({
            city: 'Seattle',
            state: 'WA',
            street: '456 Another St',
            zip: '98119',
          }),
        }),
      ]),
    );

    const deleteContact1 = await deleteContact(contact1.data.createContact.id);
    expect(deleteContact1.data.deleteContact.id).toEqual(contact1.data.createContact.id);
    expect(deleteContact1.data.deleteContact.firstname).toEqual('David');
    expect(deleteContact1.data.deleteContact.lastname).toEqual('Jones');
    expect(deleteContact1.data.deleteContact.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
    expect(deleteContact1.data.deleteContact.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '12345 Main St',
        zip: '98110',
      }),
    );

    const listContactsResultAfterDelete = await listContacts();
    expect(listContactsResultAfterDelete.data.listContacts.items.length).toEqual(1);
    expect(listContactsResultAfterDelete.data.listContacts.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: contact2.data.createContact.id,
          firstname: 'Chris',
          lastname: 'Sundersingh',
          tags: expect.arrayContaining(['tag3', 'tag4']),
          address: expect.objectContaining({
            city: 'Seattle',
            state: 'WA',
            street: '456 Another St',
            zip: '98119',
          }),
        }),
      ]),
    );
  });

  // CURDL on Contact table helpers
  const createContact = async (
    firstname: string,
    lastname: string,
    id?: number,
    tags?: string[],
    address?: Record<string, any>,
  ): Promise<Record<string, any>> => {
    const createMutation = /* GraphQL */ `
      mutation CreateContact($input: CreateContactInput!, $condition: ModelContactConditionInput) {
        createContact(input: $input, condition: $condition) {
          id
          firstname
          lastname
          tags
          address {
            city
            state
            street
            zip
          }
        }
      }
    `;
    const createInput = {
      input: {
        firstname,
        lastname,
        tags,
        address,
      },
    };

    if (id) {
      createInput.input['id'] = id;
    }

    const createResult: any = await appSyncClient.mutate({
      mutation: gql(createMutation),
      fetchPolicy: 'no-cache',
      variables: createInput,
    });

    return createResult;
  };

  const updateContact = async (
    id: number,
    firstname: string,
    lastname: string,
    tags?: string[],
    address?: Record<string, any>,
  ): Promise<Record<string, any>> => {
    const updateMutation = /* GraphQL */ `
      mutation UpdateContact($input: UpdateContactInput!, $condition: ModelContactConditionInput) {
        updateContact(input: $input, condition: $condition) {
          id
          firstname
          lastname
          tags
          address {
            city
            state
            street
            zip
          }
        }
      }
    `;
    const updateInput = {
      input: {
        id,
        firstname,
        lastname,
        tags,
        address,
      },
    };
    const updateResult: any = await appSyncClient.mutate({
      mutation: gql(updateMutation),
      fetchPolicy: 'no-cache',
      variables: updateInput,
    });

    return updateResult;
  };

  const deleteContact = async (id: number): Promise<Record<string, any>> => {
    const deleteMutation = /* GraphQL */ `
      mutation DeleteContact($input: DeleteContactInput!, $condition: ModelContactConditionInput) {
        deleteContact(input: $input, condition: $condition) {
          id
          firstname
          lastname
          tags
          address {
            city
            state
            street
            zip
          }
        }
      }
    `;
    const deleteInput = {
      input: {
        id,
      },
    };
    const deleteResult: any = await appSyncClient.mutate({
      mutation: gql(deleteMutation),
      fetchPolicy: 'no-cache',
      variables: deleteInput,
    });

    return deleteResult;
  };

  const getContact = async (id: number): Promise<Record<string, any>> => {
    const getQuery = /* GraphQL */ `
      query GetContact($id: Int!) {
        getContact(id: $id) {
          id
          firstname
          lastname
          tags
          address {
            city
            state
            street
            zip
          }
        }
      }
    `;
    const getInput = {
      id,
    };
    const getResult: any = await appSyncClient.query({
      query: gql(getQuery),
      fetchPolicy: 'no-cache',
      variables: getInput,
    });

    return getResult;
  };

  const listContacts = async (): Promise<Record<string, any>> => {
    const listQuery = /* GraphQL */ `
      query ListContact {
        listContacts {
          items {
            id
            firstname
            lastname
            tags
            address {
              city
              state
              street
              zip
            }
          }
        }
      }
    `;
    const listResult: any = await appSyncClient.query({
      query: gql(listQuery),
      fetchPolicy: 'no-cache',
    });

    return listResult;
  };
});
