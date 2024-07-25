import {
  addApiWithoutSchema,
  createNewProjectDir,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  getProjectMeta,
  importRDSDatabase,
  initJSProjectWithProfile,
  setupRDSInstanceAndData,
} from 'amplify-category-api-e2e-core';
import axios from 'axios';
import { existsSync, readFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import path from 'path';

describe('RDS Tests', () => {
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);
  const RDS_MAPPING_FILE = 'https://amplify-rds-layer-resources.s3.amazonaws.com/rds-layer-mapping.json';

  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  let region = 'us-east-1';
  let port = 3306;
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;
  const apiName = 'rdsapi';

  let projRoot;

  beforeAll(async () => {
    projRoot = await createNewProjectDir('rdsimportapi');
    await initProjectAndImportSchema();
  });

  afterAll(async () => {
    await cleanupDatabase();
    const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projRoot);
    }
    deleteProjectDir(projRoot);
  });

  const setupDatabase = async () => {
    const dbConfig = {
      identifier,
      engine: 'mysql' as const,
      dbname: database,
      username,
      password,
      region,
    };
    const queries = [
      'CREATE TABLE Contact (id INT PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50))',
      'CREATE TABLE Person (id INT PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50))',
      'CREATE TABLE Employee (id INT PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50))',
    ];

    const db = await setupRDSInstanceAndData(dbConfig, queries);
    port = db.port;
    host = db.endpoint;
  };

  const cleanupDatabase = async () => {
    await deleteDBInstance(identifier, region);
  };

  const initProjectAndImportSchema = async (): Promise<void> => {
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
    });

    const metaAfterInit = getProjectMeta(projRoot);
    region = metaAfterInit.providers.awscloudformation.Region;
    await setupDatabase();

    await addApiWithoutSchema(projRoot, { transformerVersion: 2, apiName });

    await importRDSDatabase(projRoot, {
      database,
      host,
      port,
      username,
      password,
      useVpc: true,
      apiExists: true,
    });
  };

  it('import workflow of mysql relational database with public access', async () => {
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

    // Verify the fields in the generated schema on type 'Contact'
    const contactIdFieldType = contactObjectType.fields.find((f) => f.name.value === 'id');
    const contactFirstNameFieldType = contactObjectType.fields.find((f) => f.name.value === 'firstName');
    const contactLastNameFieldType = contactObjectType.fields.find((f) => f.name.value === 'lastName');

    expect(contactIdFieldType).toBeDefined();
    expect(contactFirstNameFieldType).toBeDefined();
    expect(contactLastNameFieldType).toBeDefined();

    // PrimaryKey directive must be defined on Id field.
    expect(contactIdFieldType.directives.find((d) => d.name.value === 'primaryKey')).toBeDefined();
  });

  // This test must be updated if the rds layer mapping file is updated
  test('check the rds layer mapping file on the service account is available', async () => {
    const rdsMappingFile = await axios.get(RDS_MAPPING_FILE);
    expect(rdsMappingFile).toBeDefined();
    expect(rdsMappingFile.data).toBeDefined();
    expect(rdsMappingFile.data).toMatchObject({
      'ap-northeast-1': { layerRegion: 'arn:aws:lambda:ap-northeast-1:582037449441:layer:AmplifySQLLayer:5' },
      'ap-northeast-2': { layerRegion: 'arn:aws:lambda:ap-northeast-2:582037449441:layer:AmplifySQLLayer:5' },
      'ap-northeast-3': { layerRegion: 'arn:aws:lambda:ap-northeast-3:582037449441:layer:AmplifySQLLayer:5' },
      'ap-south-1': { layerRegion: 'arn:aws:lambda:ap-south-1:582037449441:layer:AmplifySQLLayer:5' },
      'ap-southeast-1': { layerRegion: 'arn:aws:lambda:ap-southeast-1:582037449441:layer:AmplifySQLLayer:5' },
      'ap-southeast-2': { layerRegion: 'arn:aws:lambda:ap-southeast-2:582037449441:layer:AmplifySQLLayer:5' },
      'ca-central-1': { layerRegion: 'arn:aws:lambda:ca-central-1:582037449441:layer:AmplifySQLLayer:5' },
      'eu-central-1': { layerRegion: 'arn:aws:lambda:eu-central-1:582037449441:layer:AmplifySQLLayer:5' },
      'eu-north-1': { layerRegion: 'arn:aws:lambda:eu-north-1:582037449441:layer:AmplifySQLLayer:5' },
      'eu-west-1': { layerRegion: 'arn:aws:lambda:eu-west-1:582037449441:layer:AmplifySQLLayer:5' },
      'eu-west-2': { layerRegion: 'arn:aws:lambda:eu-west-2:582037449441:layer:AmplifySQLLayer:5' },
      'eu-west-3': { layerRegion: 'arn:aws:lambda:eu-west-3:582037449441:layer:AmplifySQLLayer:5' },
      'me-south-1': { layerRegion: 'arn:aws:lambda:me-south-1:582037449441:layer:AmplifySQLLayer:5' },
      'sa-east-1': { layerRegion: 'arn:aws:lambda:sa-east-1:582037449441:layer:AmplifySQLLayer:5' },
      'us-east-1': { layerRegion: 'arn:aws:lambda:us-east-1:582037449441:layer:AmplifySQLLayer:5' },
      'us-east-2': { layerRegion: 'arn:aws:lambda:us-east-2:582037449441:layer:AmplifySQLLayer:5' },
      'us-west-1': { layerRegion: 'arn:aws:lambda:us-west-1:582037449441:layer:AmplifySQLLayer:5' },
      'us-west-2': { layerRegion: 'arn:aws:lambda:us-west-2:582037449441:layer:AmplifySQLLayer:5' },
    });
  });
});
