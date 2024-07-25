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
} from 'amplify-category-api-e2e-core';
import { existsSync, readFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse, ListTypeNode, NamedTypeNode, EnumTypeDefinitionNode } from 'graphql';
import path from 'path';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { apiGqlCompile } from 'amplify-category-api-e2e-core/src/categories/api';
import { getDefaultStrategyNameForDbType, normalizeDbType, getResourceNamesForStrategyName } from '@aws-amplify/graphql-transformer-core';
import { ModelDataSourceStrategySqlDbType } from '@aws-amplify/graphql-transformer-interfaces';

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

    await amplifyPush(projRoot);
    await sleep(2 * 60 * 1000); // Wait for 2 minutes for the VPC endpoints to be live.
    await verifyApiEndpointAndCreateClient();

    await apiGqlCompile(projRoot);
    verifySQLLambdaIsInVpc();
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
      "CREATE TYPE contact_status AS ENUM ('active', 'inactive')",
      'CREATE TABLE Contact (id VARCHAR(40) PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50), strArray VARCHAR[], intArray INT[], status contact_status)',
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
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
      name: projName,
    });

    const metaAfterInit = getProjectMeta(projRoot);
    region = metaAfterInit.providers.awscloudformation.Region;
    await setupDatabase();

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
  };

  test('check import workflow works on postgres database', async () => {
    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
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

    // Verify the fields in the generated schema on type 'Contacts'
    const contactsIdFieldType = contactObjectType.fields.find((f) => f.name.value === 'id');
    const contactsFirstNameFieldType = contactObjectType.fields.find((f) => f.name.value === 'firstname');
    const contactsLastNameFieldType = contactObjectType.fields.find((f) => f.name.value === 'lastname');
    const contactsStrArrayFieldType = contactObjectType.fields.find((f) => f.name.value === 'strarray') as unknown as ListTypeNode;
    const contactsIntArrayFieldType = contactObjectType.fields.find((f) => f.name.value === 'intarray') as unknown as ListTypeNode;

    expect(contactsIdFieldType).toBeDefined();
    expect(contactsFirstNameFieldType).toBeDefined();
    expect(contactsLastNameFieldType).toBeDefined();

    // Verify the array type fields in the generated schema on type 'Contact'
    expect(contactsStrArrayFieldType).toBeDefined();
    expect(contactsIntArrayFieldType).toBeDefined();
    expect(contactsStrArrayFieldType.type.kind).toEqual('ListType');
    expect(contactsIntArrayFieldType.type.kind).toEqual('ListType');
    expect((contactsStrArrayFieldType.type as ListTypeNode).type.kind).toEqual('NamedType');
    expect((contactsIntArrayFieldType.type as ListTypeNode).type.kind).toEqual('NamedType');
    const contactsStrArrayFieldTypeName = (contactsStrArrayFieldType.type as ListTypeNode).type as NamedTypeNode;
    const contactsIntArrayFieldTypeName = (contactsIntArrayFieldType.type as ListTypeNode).type as NamedTypeNode;
    expect(contactsStrArrayFieldTypeName.name.value).toEqual('String');
    expect(contactsIntArrayFieldTypeName.name.value).toEqual('Int');

    // Verify Enum type is generated for the enum type in the database
    const contactStatusField = contactObjectType.fields.find((f) => f.name.value === 'status');
    expect(contactStatusField).toBeDefined();
    expect(contactStatusField.type.kind).toEqual('NamedType');
    expect((contactStatusField.type as NamedTypeNode).name.value).toEqual('ContactStatus');

    // Verify the Enum type
    const contactStatusEnumType = schema.definitions.find(
      (d) => d.kind === 'EnumTypeDefinition' && d.name.value === 'ContactStatus',
    ) as EnumTypeDefinitionNode;
    expect(contactStatusEnumType).toBeDefined();
    expect(contactStatusEnumType.values.length).toEqual(2);
    expect(contactStatusEnumType.values.map((e) => e.name.value)).toEqual(expect.arrayContaining(['active', 'inactive']));

    // PrimaryKey directive must be defined on Id field.
    expect(contactsIdFieldType.directives.find((d) => d.name.value === 'primaryKey')).toBeDefined();
  });
});
