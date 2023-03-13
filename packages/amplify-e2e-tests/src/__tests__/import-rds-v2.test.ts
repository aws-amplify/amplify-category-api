import { createRDSInstance, addRDSPortInboundRule, RDSTestDataProvider, removeRDSPortInboundRule, deleteDBInstance } from 'amplify-category-api-e2e-core';
import axios from 'axios';
import generator from 'generate-password';
import {
  addApiWithBlankSchema,
  importRDSDatabase,
  amplifyPush,
  createNewProjectDir, 
  deleteProject, 
  deleteProjectDir, 
  initJSProjectWithProfile, 
  updateApiSchema,
  getProjectMeta
} from 'amplify-category-api-e2e-core';
import _ from 'lodash';
import { join } from 'path';
import * as fs from 'fs-extra';
import { parse } from 'graphql';

const [db_user, db_password, db_identifier] = generator.generateMultiple(3);
const db_name = 'mysql_database_test';
const region = 'us-east-1';
const identifier = `integtest${db_identifier}`;
const dbConnectionInfo = {
  publicIpCidr: "0.0.0.0/0",
  port: 3306,
  host: "mysql-database-1.czenrtjqdyxu.us-east-1.rds.amazonaws.com"
};
const sqlStatements = [
  "CREATE TABLE Contacts (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))",
  "CREATE TABLE Person (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))",
  "CREATE TABLE Employee (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))",
];

const setupRDSDatabase = async (): Promise<RDSTestDataProvider> => {
  // Get the public IP of the machine running the test
  const url = "http://api.ipify.org/";
  const response = await axios(url);
  dbConnectionInfo.publicIpCidr = `${response.data.trim()}/32`;
  const username = db_user;
  const password = db_password;
  const db = await createRDSInstance({
    identifier,
    engine: 'mysql',
    dbname: db_name,
    username,
    password,
    region,
  });
  dbConnectionInfo.port = db.port;
  dbConnectionInfo.host = db.endpoint;
  
  await addRDSPortInboundRule({
    region,
    port: dbConnectionInfo.port,
    cidrIp: dbConnectionInfo.publicIpCidr,
  });

  const dbAdapter = new RDSTestDataProvider({
    host: dbConnectionInfo.host,
    port: dbConnectionInfo.port,
    username,
    password,
    database: db_name,
  });
  return dbAdapter;
};

describe("Import RDS V2 API Tests", () => {
  let dbAdapter: RDSTestDataProvider;
  let projectRoot: string;

  beforeAll(async () => {
    dbAdapter = await setupRDSDatabase();
    await dbAdapter.runQuery(sqlStatements);
  });

  afterAll(async () => {
    dbAdapter?.cleanup();
    await removeRDSPortInboundRule({
      region,
      port: dbConnectionInfo.port,
      cidrIp: dbConnectionInfo.publicIpCidr,
    });
    await deleteDBInstance(identifier, region);
  });

  beforeEach(async () => {
    projectRoot = await createNewProjectDir('import-rds-v2');
  });

  afterEach(async () => {
    await deleteProject(projectRoot);
    deleteProjectDir(projectRoot);
  });

  it.only("adds a new api if one does not already exist", async () => {
    const name = 'importnewapi';
    await initJSProjectWithProfile(projectRoot, { name });
    await importRDSDatabase(projectRoot, {
      database: db_name,
      host: dbConnectionInfo.host,
      port: dbConnectionInfo.port,
      username: db_user,
      password: db_password,
      apiExists: false
    });
    await amplifyPush(projectRoot);

    verifyAmplifyMeta(projectRoot, name);
    verifyCompiledSchema(projectRoot, name);
  });

  it("uses the existing api if one exists", async () => {

  });

  it("allows re-generation of the imported schema", async () => {

  });

  it("allows updating the DB user credentials", async () => {

  });

  it("automatically re-prompts for secrets if they are incorrect during schema generation", async () => {

  });

  it("removing the API clears out the imported schema file", async () => {

  });

  it("adding a new environment carries over the imported schema and DB secrets", async () => {

  });

  it("checking out an existing environment and re-generating the imported schema uses the secrets for that environment", async () => {

  });

  it("removing an environment clears out DB details and user secrets", async() => {

  });
}); 

const verifyAmplifyMeta = (projectRoot: string, apiName: string) => {
  // Database info is updated in meta file
  const meta = getProjectMeta(projectRoot);
  const apiMeta = _.get(meta, ['api', apiName]);
  expect(apiMeta).toBeDefined();
  const dataSourceConfig = _.get(apiMeta, 'dataSourceConfig');
  expect(dataSourceConfig).toBeDefined();
  expect(dataSourceConfig).toEqual({
    mysql: db_name
  });
};

const verifyCompiledSchema = (projectRoot: string, apiName: string) => {
  const compiledSchemaPath = join(projectRoot, 'backend', 'api', apiName, 'build', 'schema.graphql');
  expect(fs.existsSync(compiledSchemaPath)).toEqual(true);

  const schema = fs.readFileSync(compiledSchemaPath, { encoding: 'utf-8' });
  const parsedSchema = parse(schema);
  expect(parsedSchema?.definitions).toBeDefined();
};
