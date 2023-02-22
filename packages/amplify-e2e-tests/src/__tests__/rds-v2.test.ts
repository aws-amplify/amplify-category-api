import {
  createRDSInstance,
  addRDSPortInboundRule,
  RDSTestDataProvider,
  removeRDSPortInboundRule,
  deleteDBInstance,
  createNewProjectDir,
  initJSProjectWithProfile,
  deleteProject,
  deleteProjectDir,
  addApiWithBlankSchemaAndConflictDetection, amplifyPush, getProjectMeta,
} from 'amplify-category-api-e2e-core';
import axios from 'axios';
import generator from 'generate-password';
import AWSAppSyncClient, {AUTH_TYPE} from 'aws-appsync';

describe('RDS Tests', () => {
  let publicIpCidr = '0.0.0.0/0';
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

  let identifier: string;
  let region: string;
  let db;
  let dbAdapter: RDSTestDataProvider;
  let projectDir: string;
  let appSyncClient: AWSAppSyncClient<any>;

  beforeAll(async () => {
    // Get the public IP of the machine running the test
    const url = 'http://api.ipify.org/';
    const response = await axios(url);
    publicIpCidr = `${response.data.trim()}/32`;

    // 1. Create a RDS Instance
    // 2. Add the external IP address of the current machine to security group inbound rule to allow public access
    // 3. Connect to the database and execute DDL
    const username = db_user;
    const password = db_password;
    region = 'us-east-1';
    identifier = `integtest${db_identifier}`;
    db = await createRDSInstance({
      identifier,
      engine: 'mysql',
      dbname: 'default_db',
      username,
      password,
      region,
    });
    await addRDSPortInboundRule({
      region,
      port: db.port,
      cidrIp: publicIpCidr,
    });

    dbAdapter = new RDSTestDataProvider({
      host: db.endpoint,
      port: db.port,
      username,
      password,
      database: db.dbName,
    });
  });

  afterAll(async () => {
    // 1. Remove the IP address from the security group
    // 2. Delete the RDS instance
    await dbAdapter.runQuery([
      'CREATE TABLE Contacts (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))',
      'CREATE TABLE Person (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))',
      'CREATE TABLE Employee (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))',
    ]);
    dbAdapter.cleanup();

    await removeRDSPortInboundRule({
      region,
      port: db.port,
      cidrIp: publicIpCidr,
    });
    await deleteDBInstance(identifier, region);
  });

  beforeEach(async () => {
    const name = 'rdstest';
    projectDir = await createNewProjectDir('rdstest');
    await initJSProjectWithProfile(projectDir, {});
    await addApiWithBlankSchemaAndConflictDetection(projectDir, { transformerVersion: 2 });
    await amplifyPush(projectDir);

    const meta = getProjectMeta(projectDir);
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

  afterEach(async () => {
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
  });

  it('Execute some test queries against the database', async () => {
    // This test performs the below

  });
});
