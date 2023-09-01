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
  apiGenerateSchema,
  apiGenerateSchemaWithError,
} from 'amplify-category-api-e2e-core';
import axios from 'axios';
import { existsSync, readFileSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import path from 'path';

describe('RDS Generate Schema tests', () => {
  let publicIpCidr = '0.0.0.0/0';
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  const region = 'us-east-1';
  let port = 3306;
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;
  const apiName = 'rdsapi';

  let projRoot;

  beforeAll(async () => {
    // Get the public IP of the machine running the test
    const url = 'http://api.ipify.org/';
    const response = await axios(url);
    publicIpCidr = `${response.data.trim()}/32`;
    await setupDatabase();

    projRoot = await createNewProjectDir('rdsimportapi');
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
    });

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
  });

  afterAll(async () => {
    await cleanupDatabase();

    const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projRoot);
    }
    deleteProjectDir(projRoot);
  });

  // beforeEach(async () => {
  // });

  // afterEach(async () => {
  // });

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
      'CREATE TABLE Person (ID INT PRIMARY KEY, Info JSON NOT NULL)',
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

  it('preserves the schema edits for mysql relational database', async () => {
    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.rds.graphql');
    const schemaContent = readFileSync(rdsSchemaFilePath, 'utf8');
    const schema = parse(schemaContent);

    // Generated schema should contains the types and fields from the database
    const contactsObjectType = schema.definitions.find(
      (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Contacts',
    ) as ObjectTypeDefinitionNode;
    const personObjectType = schema.definitions.find(
      (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Person',
    ) as ObjectTypeDefinitionNode;
    expect(contactsObjectType).toBeDefined();
    expect(personObjectType).toBeDefined();

    // Verify the fields in the generated schema on type 'Contacts'
    const contactsIdFieldType = contactsObjectType.fields.find((f) => f.name.value === 'ID');
    const contactsFirstNameFieldType = contactsObjectType.fields.find((f) => f.name.value === 'FirstName');
    const contactsLastNameFieldType = contactsObjectType.fields.find((f) => f.name.value === 'LastName');
    expect(contactsIdFieldType).toBeDefined();
    expect(contactsFirstNameFieldType).toBeDefined();
    expect(contactsLastNameFieldType).toBeDefined();
    // PrimaryKey directive must be defined on Id field.
    expect(contactsIdFieldType.directives.find((d) => d.name.value === 'primaryKey')).toBeDefined();

    // Verify the fields in the generated schema on type 'Person' before making edits
    const personsIdFieldType = personObjectType.fields.find((f) => f.name.value === 'ID');
    const personsInfoFieldType = personObjectType.fields.find((f) => f.name.value === 'Info') as any;
    expect(personsIdFieldType).toBeDefined();
    expect(personsInfoFieldType).toBeDefined();
    expect(personsInfoFieldType.type?.type?.name?.value).toEqual('AWSJSON');

    // Make edits to the generated schema
    const editedSchema = `
        input AMPLIFY {
            engine: String = "mysql"
            globalAuthRule: AuthRule = {allow: public}
        }

        type Contacts @model {
            ID: Int! @primaryKey
            FirstName: String
            LastName: String
        }

        type Person @model {
            ID: Int! @primaryKey
            Info: [String]!
        }
      `;
    writeFileSync(rdsSchemaFilePath, editedSchema);
    await apiGenerateSchema(projRoot, {
      database,
      host,
      port,
      username,
      password,
      validCredentials: true,
    });

    // The re-generated schema preserves the edits that were made
    const regeneratedSchema = readFileSync(rdsSchemaFilePath, 'utf8');
    expect(regeneratedSchema.replace(/\s/g, '')).toEqual(editedSchema.replace(/\s/g, ''));
  });

  it('throws error when an invalid edit is made to the schema', async () => {
    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.rds.graphql');
    // Make edits to the generated schema to make it invalid
    const editedSchema = `
        // This comment is invalid in GraphQL schema
        input AMPLIFY {
            engine: String = "mysql"
            globalAuthRule: AuthRule = {allow: public}
        }
      `;
    writeFileSync(rdsSchemaFilePath, editedSchema);
    await apiGenerateSchemaWithError(projRoot, {
      database,
      host,
      port,
      username,
      password,
      validCredentials: true,
      errMessage: `The schema file at ${rdsSchemaFilePath} is not a valid GraphQL document. Syntax Error: Cannot parse the unexpected character "/".`,
    });
  });
});
