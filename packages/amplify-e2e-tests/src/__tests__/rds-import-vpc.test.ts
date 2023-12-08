import path from 'path';
import {
  addApiWithoutSchema,
  amplifyPush,
  apiGqlCompile,
  createNewProjectDir,
  createRDSInstance,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  getAppSyncApi,
  getProjectMeta,
  importRDSDatabase,
  initJSProjectWithProfile,
  updateSchema,
  getResource,
  sleep,
} from 'amplify-category-api-e2e-core';
import { existsSync, readFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import gql from 'graphql-tag';
import { print } from 'graphql';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { ResourceConstants } from 'graphql-transformer-common';
import { getDefaultStrategyNameForDbType, getResourceNamesForStrategyName, normalizeDbType } from '@aws-amplify/graphql-transformer-core';
import { ModelDataSourceStrategySqlDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { SQL_TESTS_USE_BETA } from '../rds-v2-tests-common/sql-e2e-config';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

const CDK_FUNCTION_TYPE = 'AWS::Lambda::Function';
const CDK_VPC_ENDPOINT_TYPE = 'AWS::EC2::VPCEndpoint';
const CDK_SUBSCRIPTION_TYPE = 'AWS::SNS::Subscription';
const APPSYNC_DATA_SOURCE_TYPE = 'AWS::AppSync::DataSource';

const { AmplifySQLLayerNotificationTopicAccount, AmplifySQLLayerNotificationTopicName } = ResourceConstants.RESOURCES;

const engine = 'mysql';
const strategyName = getDefaultStrategyNameForDbType(normalizeDbType(engine) as ModelDataSourceStrategySqlDbType);
const resourceNames = getResourceNamesForStrategyName(strategyName);

describe('RDS Tests', () => {
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  let port = 3306;
  let region = 'us-east-1';
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;
  const projName = 'rdsimportapi';
  let projRoot = '';

  afterAll(async () => {
    await cleanupDatabase();
  });

  beforeEach(async () => {
    projRoot = await createNewProjectDir('rdsimportapi');
  });

  afterEach(async () => {
    const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projRoot);
    }
    deleteProjectDir(projRoot);
  });

  const setupDatabase = async (): Promise<void> => {
    const db = await createRDSInstance({
      identifier,
      engine: 'mysql',
      dbname: database,
      username,
      password,
      region,
      publiclyAccessible: false,
    });
    port = db.port;
    host = db.endpoint;
  };

  const cleanupDatabase = async (): Promise<void> => {
    await deleteDBInstance(identifier, region);
  };

  it('import workflow of mysql relational database within vpc with no public access', async () => {
    const apiName = 'rdsapivpc';
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
      name: projName,
    });

    const metaAfterInit = getProjectMeta(projRoot);
    region = metaAfterInit.providers.awscloudformation.Region;
    await setupDatabase();

    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');

    await addApiWithoutSchema(projRoot, { transformerVersion: 2, apiName });

    // This only verifies the prompt for VPC access. Does not verify the actual import.
    await importRDSDatabase(projRoot, {
      database: 'mysql', // Import the default 'mysql' database
      host,
      port,
      username,
      password,
      useVpc: true,
      apiExists: true,
    });

    console.log(`Reading schema file at ${rdsSchemaFilePath}`);
    const schemaContent = readFileSync(rdsSchemaFilePath, 'utf8');
    const schema = parse(schemaContent);

    // Generated schema should contain the types with model directive
    // db is one of the default table in mysql database
    const dbObjectType = schema.definitions.find(
      (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Db',
    ) as ObjectTypeDefinitionNode;
    expect(dbObjectType).toBeDefined();
    expect(dbObjectType.directives.find((d) => d.name.value === 'model')).toBeDefined();

    const updatedSchema = gql`
      input AMPLIFY {
        engine: String = "mysql"
        globalAuthRule: AuthRule = { allow: public }
      }

      type component @model {
        component_id: Int! @primaryKey
        component_group_id: Int!
        component_urn: String!
      }
    `;
    updateSchema(projRoot, apiName, print(updatedSchema), 'schema.sql.graphql');
    await apiGqlCompile(projRoot);

    // Validate the generated resources in the CloudFormation template
    const apisDirectory = path.join(projRoot, 'amplify', 'backend', 'api');
    const apiDirectory = path.join(apisDirectory, apiName);
    const cfnRDSTemplateFile = path.join(apiDirectory, 'build', 'stacks', `${resourceNames.sqlStack}.json`);
    const cfnTemplate = JSON.parse(readFileSync(cfnRDSTemplateFile, 'utf8'));
    expect(cfnTemplate.Resources).toBeDefined();
    const resources = cfnTemplate.Resources;

    // Validate if the SQL lambda function has VPC configuration
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

    // Validate patching lambda and subscription
    const rdsPatchingLambdaFunction = getResource(resources, resourceNames.sqlPatchingLambdaFunction, CDK_FUNCTION_TYPE);
    expect(rdsPatchingLambdaFunction).toBeDefined();
    expect(rdsPatchingLambdaFunction.Properties).toBeDefined();
    expect(rdsPatchingLambdaFunction.Properties.Environment).toBeDefined();
    expect(rdsPatchingLambdaFunction.Properties.Environment.Variables).toBeDefined();
    expect(rdsPatchingLambdaFunction.Properties.Environment.Variables.LAMBDA_FUNCTION_ARN).toBeDefined();
    const rdsDataSourceLambda = getResource(resources, resourceNames.sqlLambdaDataSource, APPSYNC_DATA_SOURCE_TYPE);
    expect(rdsPatchingLambdaFunction.Properties.Environment.Variables.LAMBDA_FUNCTION_ARN).toEqual(
      rdsDataSourceLambda.Properties.LambdaConfig.LambdaFunctionArn,
    );

    // Validate subscription
    const expectedTopicArn = {
      'Fn::Join': [
        ':',
        ['arn:aws:sns', { Ref: 'AWS::Region' }, `${AmplifySQLLayerNotificationTopicAccount}:${AmplifySQLLayerNotificationTopicName}`],
      ],
    };
    // Counterintuitively, the subscription actually gets created with the resource prefix of the FUNCTION that gets triggered, rather than
    // the scope created specifically for the subscription
    const rdsPatchingSubscription = getResource(resources, resourceNames.sqlPatchingLambdaFunction, CDK_SUBSCRIPTION_TYPE);
    expect(rdsPatchingSubscription).toBeDefined();
    expect(rdsPatchingSubscription.Properties).toBeDefined();
    expect(rdsPatchingSubscription.Properties.Protocol).toBeDefined();
    expect(rdsPatchingSubscription.Properties.Protocol).toEqual('lambda');
    expect(rdsPatchingSubscription.Properties.Endpoint).toBeDefined();
    expect(rdsPatchingSubscription.Properties.TopicArn).toBeDefined();
    expect(rdsPatchingSubscription.Properties.TopicArn).toMatchObject(expectedTopicArn);
    expect(rdsPatchingSubscription.Properties.Region).toBeDefined();
    expect(rdsPatchingSubscription.Properties.FilterPolicy).toBeDefined();
    expect(rdsPatchingSubscription.Properties.FilterPolicy.Region).toBeDefined();

    await amplifyPush(projRoot, false, {
      useBetaSqlLayer: SQL_TESTS_USE_BETA,
    });
    await sleep(2 * 60 * 1000); // Wait for 2 minutes for the VPC endpoints to be live.

    // Get the AppSync API details after deployment
    const meta = getProjectMeta(projRoot);
    const { output } = meta.api.rdsapivpc;
    const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, region);

    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);

    const apiEndPoint = GraphQLAPIEndpointOutput as string;
    const apiKey = GraphQLAPIKeyOutput as string;

    const appSyncClient = new AWSAppSyncClient({
      url: apiEndPoint,
      region,
      disableOffline: true,
      auth: {
        type: AUTH_TYPE.API_KEY,
        apiKey,
      },
    });

    expect(appSyncClient).toBeDefined();

    const result = await listComponents(appSyncClient);
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.listComponents).toBeDefined();
    expect(result.data.listComponents.items).toBeDefined();
    expect(result.data.listComponents.items.length).toEqual(0);
  });
});

const listComponents = async (client) => {
  const listComponentsQuery = /* GraphQL */ `
    query listComponents {
      listComponents {
        items {
          component_group_id
          component_id
          component_urn
        }
      }
    }
  `;
  const listResult: any = await client.query({
    query: gql(listComponentsQuery),
    fetchPolicy: 'no-cache',
  });

  return listResult;
};
