import {
  addApiWithoutSchema, 
  amplifyPush, 
  createNewProjectDir, 
  createRDSInstance, 
  deleteDBInstance, 
  deleteProject, 
  deleteProjectDir, 
  importRDSDatabase, 
  initJSProjectWithProfile, 
} from 'amplify-category-api-e2e-core';
import axios from 'axios';
import { existsSync, readFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import path from 'path';

describe("RDS Tests", () => {
  let publicIpCidr = "0.0.0.0/0";
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);
  
  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  const region = 'us-east-1';
  let port = 3306;
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;

  let projRoot;

  beforeAll(async () => {
    // Get the public IP of the machine running the test
    const url = "http://api.ipify.org/";
    const response = await axios(url);
    publicIpCidr = `${response.data.trim()}/32`;
    await setupDatabase();
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
    });
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
