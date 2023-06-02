import { getHostVpc } from '@aws-amplify/graphql-schema-generator';
import { DescribeSecurityGroupsCommand, EC2Client } from '@aws-sdk/client-ec2';
import {
  addApiWithoutSchema, 
  addRDSPortInboundRule, 
  addRDSPortInboundRuleToGroupId, 
  amplifyPush, 
  createNewProjectDir, 
  createRDSInstance, 
  deleteDBInstance, 
  deleteProject, 
  deleteProjectDir, 
  getProjectMeta, 
  importRDSDatabase, 
  initJSProjectWithProfile, 
} from 'amplify-category-api-e2e-core';
import { existsSync, readFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import path from 'path';

describe("RDS Tests", () => {
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);
  
  // Generate settings for RDS instance
  const publicIpCidr = "0.0.0.0/0";
  const username = db_user;
  const password = db_password;
  let port = 3306;
  let region = 'us-east-1';
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;

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

    const vpc = await getHostVpc(host, region);
    if (!vpc) {
      throw new Error("Unable to get the VPC details for the RDS instance.");
    }

    // Add inbound rule to allow access from the schema inspector lambda function
    vpc.securityGroupIds.forEach(async (sg) => {
      await addRDSPortInboundRuleToGroupId({
        securityGroupId: sg,
        port,
        cidrIp: publicIpCidr,
        region,
      });
    });
  };

  // const getSecurityGroupNames = async (securityGroupIds: string[]): Promise<string[]> => {
  //   const ec2Client = new EC2Client({ region });
  //   const securityGroups = await ec2Client.send(new DescribeSecurityGroupsCommand({
  //     GroupIds: securityGroupIds,
  //   }));
  //   return securityGroups.SecurityGroups.map(sg => sg.GroupName);
  // };

  const cleanupDatabase = async () => {
    await deleteDBInstance(identifier, region);
  };

  it("import workflow of mysql relational database with public access", async () => {
    const apiName = 'rdsapivpc';
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
    });
    const meta = getProjectMeta(projRoot);
    region = meta.providers.awscloudformation.Region;
    await setupDatabase();
  
    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.rds.graphql');

    await addApiWithoutSchema(projRoot, { transformerVersion: 2, apiName });
    await amplifyPush(projRoot);

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
  });
}); 
