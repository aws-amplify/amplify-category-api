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
} from 'amplify-category-api-e2e-core';
import { existsSync, readFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import gql from 'graphql-tag';
import path from 'path';
import { print } from 'graphql';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

const CDK_FUNCTION_TYPE = 'AWS::Lambda::Function';
const CDK_SUBSCRIPTION_TYPE = 'AWS::SNS::Subscription';
const APPSYNC_DATA_SOURCE_TYPE = 'AWS::AppSync::DataSource';

const SNS_TOPIC_REGION = 'us-east-1';
const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:582037449441:AmplifyRDSLayerNotification';

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
  let projRoot;

  beforeAll(async () => {});

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

  const setupDatabase = async () => {
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

  const cleanupDatabase = async () => {
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

    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.rds.graphql');

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

    const schemaContent = readFileSync(rdsSchemaFilePath, 'utf8');
    const schema = parse(schemaContent);

    // Generated schema should contain the types with model directive
    // db is one of the default table in mysql database
    const dbObjectType = schema.definitions.find(
      (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'db',
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
    updateSchema(projRoot, apiName, print(updatedSchema), 'schema.rds.graphql');
    await apiGqlCompile(projRoot);

    // Validate the generated resources in the CloudFormation template
    const apisDirectory = path.join(projRoot, 'amplify', 'backend', 'api');
    const apiDirectory = path.join(apisDirectory, apiName);
    const cfnRDSTemplateFile = path.join(apiDirectory, 'build', 'stacks', `RdsApiStack.json`);
    const cfnTemplate = JSON.parse(readFileSync(cfnRDSTemplateFile, 'utf8'));
    expect(cfnTemplate.Resources).toBeDefined();
    const resources = cfnTemplate.Resources;

    // Validate if the SQL lambda function has VPC configuration
    const rdsLambdaFunction = getResource(resources, 'RDSLambdaLogicalID', CDK_FUNCTION_TYPE);
    expect(rdsLambdaFunction).toBeDefined();
    expect(rdsLambdaFunction.Properties).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig.SubnetIds).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig.SubnetIds.length).toBeGreaterThan(0);
    expect(rdsLambdaFunction.Properties.VpcConfig.SecurityGroupIds).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig.SecurityGroupIds.length).toBeGreaterThan(0);

    // Validate patching lambda and subscription
    const rdsPatchingLambdaFunction = getResource(resources, 'RDSPatchingLambdaLogicalID', CDK_FUNCTION_TYPE);
    expect(rdsPatchingLambdaFunction).toBeDefined();
    expect(rdsPatchingLambdaFunction.Properties).toBeDefined();
    expect(rdsPatchingLambdaFunction.Properties.Environment).toBeDefined();
    expect(rdsPatchingLambdaFunction.Properties.Environment.Variables).toBeDefined();
    expect(rdsPatchingLambdaFunction.Properties.Environment.Variables.LAMBDA_FUNCTION_ARN).toBeDefined();
    const rdsDataSourceLambda = getResource(resources, 'RDSLambdaDataSource', APPSYNC_DATA_SOURCE_TYPE);
    expect(rdsPatchingLambdaFunction.Properties.Environment.Variables.LAMBDA_FUNCTION_ARN).toEqual(
      rdsDataSourceLambda.Properties.LambdaConfig.LambdaFunctionArn,
    );

    // Validate subscription
    const rdsPatchingSubscription = getResource(resources, 'RDSPatchingLambdaLogicalID', CDK_SUBSCRIPTION_TYPE);
    expect(rdsPatchingSubscription).toBeDefined();
    expect(rdsPatchingSubscription.Properties).toBeDefined();
    expect(rdsPatchingSubscription.Properties.Protocol).toBeDefined();
    expect(rdsPatchingSubscription.Properties.Protocol).toEqual('lambda');
    expect(rdsPatchingSubscription.Properties.Endpoint).toBeDefined();
    expect(rdsPatchingSubscription.Properties.TopicArn).toBeDefined();
    expect(rdsPatchingSubscription.Properties.TopicArn).toEqual(SNS_TOPIC_ARN);
    expect(rdsPatchingSubscription.Properties.Region).toEqual(SNS_TOPIC_REGION);
    expect(rdsPatchingSubscription.Properties.FilterPolicy).toBeDefined();
    expect(rdsPatchingSubscription.Properties.FilterPolicy.Region).toBeDefined();

    await amplifyPush(projRoot);

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

    // VPC will not have VPC endpoints for SSM defined and the security group's inbound rule for port 443 is not defined.
    // Expect the listComponents query to fail with an error.
    expect(appSyncClient).toBeDefined();
    try {
      await listComponents(appSyncClient);
      throw new Error('Expected listComponents to fail.');
    } catch (err) {
      expect(err.message).toEqual('GraphQL error: Unable to get the database credentials. Check the logs for more details.');
    }
  });
});

const getResource = (resources: Map<string, any>, resourcePrefix: string, resourceType: string): any => {
  const keys = Array.from(Object.keys(resources)).filter((key) => key.startsWith(resourcePrefix));
  for (const key of keys) {
    const resource = resources[key];
    if (resource.Type === resourceType) {
      return resource;
    }
  }
};

const listComponents = async (client) => {
  const listComponents = /* GraphQL */ `
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
    query: gql(listComponents),
    fetchPolicy: 'no-cache',
  });

  return listResult;
};
