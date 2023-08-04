import {
  RDSTestDataProvider,
  addApiWithoutSchema,
  addRDSPortInboundRule,
  createNewProjectDir,
  createRDSInstance,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  importRDSDatabase,
  initJSProjectWithProfile,
  removeRDSPortInboundRule,
} from 'amplify-category-api-e2e-core';
import axios from 'axios';
import { existsSync, readFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import path from 'path';

describe('RDS Tests', () => {
  let publicIpCidr = '0.0.0.0/0';
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);
  const RDS_MAPPING_FILE = 'https://amplify-rds-layer-resources.s3.amazonaws.com/rds-layer-mapping.json';

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
    const url = 'http://api.ipify.org/';
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
    // This test performs the below
    // 1. Create a RDS Instance
    // 2. Add the external IP address of the current machine to security group inbound rule to allow public access
    // 3. Connect to the database and execute DDL

    const db = await createRDSInstance({
      identifier,
      engine: 'mysql',
      dbname: database,
      username,
      password,
      region,
    });
    port = db.port;
    host = db.endpoint;
    await addRDSPortInboundRule({
      region,
      port: db.port,
      cidrIp: publicIpCidr,
    });

    const dbAdapter = new RDSTestDataProvider({
      host: db.endpoint,
      port: db.port,
      username,
      password,
      database: db.dbName,
    });
    await dbAdapter.runQuery([
      'CREATE TABLE Contacts (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))',
      'CREATE TABLE Person (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))',
      'CREATE TABLE Employee (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))',
    ]);
    dbAdapter.cleanup();
  };

  const cleanupDatabase = async () => {
    // 1. Remove the IP address from the security group
    // 2. Delete the RDS instance
    await removeRDSPortInboundRule({
      region,
      port: port,
      cidrIp: publicIpCidr,
    });
    await deleteDBInstance(identifier, region);
  };

  it('import workflow of mysql relational database with public access', async () => {
    const apiName = 'rdsapi';
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
    });
    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.rds.graphql');

    await addApiWithoutSchema(projRoot, { transformerVersion: 2, apiName });

    await importRDSDatabase(projRoot, {
      database,
      host,
      port,
      username,
      password,
      useVpc: false,
      apiExists: true,
    });

    const schemaContent = readFileSync(rdsSchemaFilePath, 'utf8');
    const schema = parse(schemaContent);

    // Generated schema should contains the types and fields from the database
    const contactsObjectType = schema.definitions.find(
      (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Contacts',
    ) as ObjectTypeDefinitionNode;
    const personObjectType = schema.definitions.find((d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Person');
    const employeeObjectType = schema.definitions.find((d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Employee');

    expect(contactsObjectType).toBeDefined();
    expect(personObjectType).toBeDefined();
    expect(employeeObjectType).toBeDefined();

    // Verify the fields in the generated schema on type 'Contacts'
    const contactsIdFieldType = contactsObjectType.fields.find((f) => f.name.value === 'ID');
    const contactsFirstNameFieldType = contactsObjectType.fields.find((f) => f.name.value === 'FirstName');
    const contactsLastNameFieldType = contactsObjectType.fields.find((f) => f.name.value === 'LastName');

    expect(contactsIdFieldType).toBeDefined();
    expect(contactsFirstNameFieldType).toBeDefined();
    expect(contactsLastNameFieldType).toBeDefined();

    // PrimaryKey directive must be defined on Id field.
    expect(contactsIdFieldType.directives.find((d) => d.name.value === 'primaryKey')).toBeDefined();
  });

  // This test must be updated if the rds layer mapping file is updated
  test('check the rds layer mapping file on the service account is available', async () => {
    const rdsMappingFile = await axios.get(RDS_MAPPING_FILE);
    expect(rdsMappingFile).toBeDefined();
    expect(rdsMappingFile.data).toBeDefined();
    expect(rdsMappingFile.data).toMatchObject({
      'ap-northeast-1': {
        layerRegion: 'arn:aws:lambda:ap-northeast-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'us-east-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'ap-southeast-1': {
        layerRegion: 'arn:aws:lambda:ap-southeast-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'eu-west-1': {
        layerRegion: 'arn:aws:lambda:eu-west-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'us-west-1': {
        layerRegion: 'arn:aws:lambda:us-west-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'ap-east-1': {
        layerRegion: 'arn:aws:lambda:ap-east-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'ap-northeast-2': {
        layerRegion: 'arn:aws:lambda:ap-northeast-2:582037449441:layer:AmplifyRDSLayer:11',
      },
      'ap-northeast-3': {
        layerRegion: 'arn:aws:lambda:ap-northeast-3:582037449441:layer:AmplifyRDSLayer:11',
      },
      'ap-south-1': {
        layerRegion: 'arn:aws:lambda:ap-south-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'ap-southeast-2': {
        layerRegion: 'arn:aws:lambda:ap-southeast-2:582037449441:layer:AmplifyRDSLayer:11',
      },
      'ca-central-1': {
        layerRegion: 'arn:aws:lambda:ca-central-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'eu-central-1': {
        layerRegion: 'arn:aws:lambda:eu-central-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'eu-north-1': {
        layerRegion: 'arn:aws:lambda:eu-north-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'eu-west-2': {
        layerRegion: 'arn:aws:lambda:eu-west-2:582037449441:layer:AmplifyRDSLayer:11',
      },
      'eu-west-3': {
        layerRegion: 'arn:aws:lambda:eu-west-3:582037449441:layer:AmplifyRDSLayer:11',
      },
      'sa-east-1': {
        layerRegion: 'arn:aws:lambda:sa-east-1:582037449441:layer:AmplifyRDSLayer:11',
      },
      'us-east-2': {
        layerRegion: 'arn:aws:lambda:us-east-2:582037449441:layer:AmplifyRDSLayer:11',
      },
      'us-west-2': {
        layerRegion: 'arn:aws:lambda:us-west-2:582037449441:layer:AmplifyRDSLayer:11',
      },
      'me-south-1': {
        layerRegion: 'arn:aws:lambda:me-south-1:582037449441:layer:AmplifyRDSLayer:11',
      },
    });
  });
});
