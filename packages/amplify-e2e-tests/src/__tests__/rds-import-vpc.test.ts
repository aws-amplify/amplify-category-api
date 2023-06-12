import {
  addApiWithoutSchema, 
  amplifyPush, 
  apiGqlCompile, 
  createNewProjectDir, 
  createRDSInstance, 
  deleteDBInstance, 
  deleteProject, 
  deleteProjectDir, 
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

describe("RDS Tests", () => {
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

  beforeAll(async () => {
  });

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

  it("import workflow of mysql relational database with public access", async () => {
    const apiName = 'rdsapivpc';
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
      name: projName,
    });
    
    const meta = getProjectMeta(projRoot);
    region = meta.providers.awscloudformation.Region;
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
    const dbObjectType = schema.definitions.find(d => d.kind === 'ObjectTypeDefinition' && d.name.value === 'db') as ObjectTypeDefinitionNode;
    expect(dbObjectType).toBeDefined();
    expect(dbObjectType.directives.find(d => d.name.value === 'model')).toBeDefined();

    const updatedSchema = gql`
      input Amplify {
        engine: String = "mysql"
        globalAuthRule: AuthRule = {allow: public}
      }

      type component @model {
        component_id: Int! @primaryKey
        component_group_id: Int!
        component_urn: String!
      }
    `;
    updateSchema(projRoot, apiName, print(updatedSchema), 'schema.rds.graphql');
    await apiGqlCompile(projRoot);

    // Validate if the SQL lambda function has VPC configuration
    const apisDirectory = path.join(projRoot, 'amplify', 'backend', 'api');
    const apiDirectory = path.join(apisDirectory, apiName);
    const cfnRDSTemplateFile = path.join(apiDirectory, 'build', 'stacks', `RdsApiStack.json`);
    const cfnTemplate = JSON.parse(readFileSync(cfnRDSTemplateFile, 'utf8'));
    console.log(JSON.stringify(cfnTemplate, null, 4));
    expect(cfnTemplate.Resources).toBeDefined();
    const resources = Object.values(cfnTemplate.Resources);
    const rdsLambdaFunction = resources.find((r: any) => r.Type === 'AWS::Lambda::Function') as any;
    expect(rdsLambdaFunction).toBeDefined();
    expect(rdsLambdaFunction.Properties).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig.SubnetIds).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig.SubnetIds.length).toBeGreaterThan(0);
    expect(rdsLambdaFunction.Properties.VpcConfig.SecurityGroupIds).toBeDefined();
    expect(rdsLambdaFunction.Properties.VpcConfig.SecurityGroupIds.length).toBeGreaterThan(0);

    await amplifyPush(projRoot);
  });
}); 
