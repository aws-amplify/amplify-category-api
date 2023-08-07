import {
  RDSTestDataProvider,
  addApiWithoutSchema,
  addRDSPortInboundRule,
  amplifyPush,
  createNewProjectDir,
  createRDSInstance,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  getAppSyncApi,
  getProjectMeta,
  importRDSDatabase,
  initJSProjectWithProfile,
  removeRDSPortInboundRule,
} from 'amplify-category-api-e2e-core';
import { existsSync, readFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import path from 'path';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import gql from 'graphql-tag';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Model Directive', () => {
  const publicIpCidr = '0.0.0.0/0';
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  const region = 'us-east-1';
  let port = 3306;
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;
  const projName = 'rdsmodelapitest';

  let projRoot;
  let appSyncClient;

  beforeAll(async () => {
    projRoot = await createNewProjectDir('rdsmodelapi');
    await setupDatabase();
    await initProjectAndImportSchema();
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);
    const region = meta.providers.awscloudformation.Region;
    const { output } = meta.api.rdsapi;
    const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, region);

    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);

    const apiEndPoint = GraphQLAPIEndpointOutput as string;
    const apiKey = GraphQLAPIKeyOutput as string;

    appSyncClient = new AWSAppSyncClient({
      url: apiEndPoint,
      region,
      disableOffline: true,
      auth: {
        type: AUTH_TYPE.API_KEY,
        apiKey,
      },
    });
  });

  afterAll(async () => {
    const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projRoot);
    }
    deleteProjectDir(projRoot);
    await cleanupDatabase();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

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
      'CREATE TABLE Contact (id VARCHAR(40) PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))',
      'CREATE TABLE Person (personId INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))',
      'CREATE TABLE Employee (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))',
      'CREATE TABLE Student (studentId INT NOT NULL, classId CHAR(1) NOT NULL, FirstName VARCHAR(20), LastName VARCHAR(50), PRIMARY KEY (studentId, classId))',
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

  const initProjectAndImportSchema = async () => {
    const apiName = 'rdsapi';
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
      name: projName,
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
    const contactObjectType = schema.definitions.find(
      (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Contact',
    ) as ObjectTypeDefinitionNode;
    const personObjectType = schema.definitions.find((d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Person');
    const employeeObjectType = schema.definitions.find((d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Employee');

    expect(contactObjectType).toBeDefined();
    expect(personObjectType).toBeDefined();
    expect(employeeObjectType).toBeDefined();

    // Verify the fields in the generated schema on type 'Contacts'
    const contactsIdFieldType = contactObjectType.fields.find((f) => f.name.value === 'id');
    const contactsFirstNameFieldType = contactObjectType.fields.find((f) => f.name.value === 'FirstName');
    const contactsLastNameFieldType = contactObjectType.fields.find((f) => f.name.value === 'LastName');

    expect(contactsIdFieldType).toBeDefined();
    expect(contactsFirstNameFieldType).toBeDefined();
    expect(contactsLastNameFieldType).toBeDefined();

    // PrimaryKey directive must be defined on Id field.
    expect(contactsIdFieldType.directives.find((d) => d.name.value === 'primaryKey')).toBeDefined();
  };

  test('check CRUDL on contact table with default primary key', async () => {
    const contact1 = await createContact('David', 'Smith');
    const contact2 = await createContact('Chris', 'Sundersingh');

    expect(contact1.data.createContact.id).toBeDefined();
    expect(contact1.data.createContact.FirstName).toEqual('David');
    expect(contact1.data.createContact.LastName).toEqual('Smith');

    expect(contact2.data.createContact.id).toBeDefined();
    expect(contact2.data.createContact.FirstName).toEqual('Chris');
    expect(contact2.data.createContact.LastName).toEqual('Sundersingh');

    const getContact1 = await getContact(contact1.data.createContact.id);
    expect(getContact1.data.getContact.id).toEqual(contact1.data.createContact.id);
    expect(getContact1.data.getContact.FirstName).toEqual('David');
    expect(getContact1.data.getContact.LastName).toEqual('Smith');

    const contact1Updated = await updateContact(contact1.data.createContact.id, 'David', 'Jones');
    expect(contact1Updated.data.updateContact.id).toEqual(contact1.data.createContact.id);
    expect(contact1Updated.data.updateContact.FirstName).toEqual('David');
    expect(contact1Updated.data.updateContact.LastName).toEqual('Jones');

    const getContact1Updated = await getContact(contact1.data.createContact.id);
    expect(getContact1Updated.data.getContact.id).toEqual(contact1.data.createContact.id);
    expect(getContact1Updated.data.getContact.FirstName).toEqual('David');
    expect(getContact1Updated.data.getContact.LastName).toEqual('Jones');

    const listContactsResult = await listContacts();
    expect(listContactsResult.data.listContacts.items.length).toEqual(2);
    expect(listContactsResult.data.listContacts.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: contact1.data.createContact.id, FirstName: 'David', LastName: 'Jones' }),
        expect.objectContaining({ id: contact2.data.createContact.id, FirstName: 'Chris', LastName: 'Sundersingh' }),
      ]),
    );

    const deleteContact1 = await deleteContact(contact1.data.createContact.id);
    expect(deleteContact1.data.deleteContact.id).toEqual(contact1.data.createContact.id);
    expect(deleteContact1.data.deleteContact.FirstName).toEqual('David');
    expect(deleteContact1.data.deleteContact.LastName).toEqual('Jones');

    const listContactsResultAfterDelete = await listContacts();
    expect(listContactsResultAfterDelete.data.listContacts.items.length).toEqual(1);
    expect(listContactsResultAfterDelete.data.listContacts.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: contact2.data.createContact.id, FirstName: 'Chris', LastName: 'Sundersingh' }),
      ]),
    );
  });

  test('check CRUDL, filter, limit and nextToken on student table with composite key', async () => {
    const student1A = await createStudent(1, 'A', 'David', 'Smith');
    const student1B = await createStudent(1, 'B', 'Chris', 'Sundersingh');
    const student2A = await createStudent(2, 'A', 'John', 'Doe');
    const student2B = await createStudent(2, 'B', 'Jane', 'Doe');

    expect(student1A.data.createStudent.studentId).toEqual(1);
    expect(student1A.data.createStudent.classId).toEqual('A');
    expect(student1A.data.createStudent.FirstName).toEqual('David');
    expect(student1A.data.createStudent.LastName).toEqual('Smith');

    expect(student1B.data.createStudent.studentId).toEqual(1);
    expect(student1B.data.createStudent.classId).toEqual('B');
    expect(student1B.data.createStudent.FirstName).toEqual('Chris');
    expect(student1B.data.createStudent.LastName).toEqual('Sundersingh');

    expect(student2A.data.createStudent.studentId).toEqual(2);
    expect(student2A.data.createStudent.classId).toEqual('A');
    expect(student2A.data.createStudent.FirstName).toEqual('John');
    expect(student2A.data.createStudent.LastName).toEqual('Doe');

    expect(student2B.data.createStudent.studentId).toEqual(2);
    expect(student2B.data.createStudent.classId).toEqual('B');
    expect(student2B.data.createStudent.FirstName).toEqual('Jane');
    expect(student2B.data.createStudent.LastName).toEqual('Doe');

    const student1AUpdated = await updateStudent(1, 'A', 'David', 'Jones');
    const student2AUpdated = await updateStudent(2, 'A', 'John', 'Smith');

    expect(student1AUpdated.data.updateStudent.studentId).toEqual(1);
    expect(student1AUpdated.data.updateStudent.classId).toEqual('A');
    expect(student1AUpdated.data.updateStudent.FirstName).toEqual('David');
    expect(student1AUpdated.data.updateStudent.LastName).toEqual('Jones');

    expect(student2AUpdated.data.updateStudent.studentId).toEqual(2);
    expect(student2AUpdated.data.updateStudent.classId).toEqual('A');
    expect(student2AUpdated.data.updateStudent.FirstName).toEqual('John');
    expect(student2AUpdated.data.updateStudent.LastName).toEqual('Smith');

    const student1ADeleted = await deleteStudent(1, 'A');

    expect(student1ADeleted.data.deleteStudent.studentId).toEqual(1);
    expect(student1ADeleted.data.deleteStudent.classId).toEqual('A');
    expect(student1ADeleted.data.deleteStudent.FirstName).toEqual('David');
    expect(student1ADeleted.data.deleteStudent.LastName).toEqual('Jones');

    const getStudent1B = await getStudent(1, 'B');

    expect(getStudent1B.data.getStudent.studentId).toEqual(1);
    expect(getStudent1B.data.getStudent.classId).toEqual('B');
    expect(getStudent1B.data.getStudent.FirstName).toEqual('Chris');
    expect(getStudent1B.data.getStudent.LastName).toEqual('Sundersingh');

    const listStudentsResult = await listStudents();
    expect(listStudentsResult.data.listStudents.items.length).toEqual(3);
    expect(listStudentsResult.data.listStudents.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ studentId: 1, classId: 'B', FirstName: 'Chris', LastName: 'Sundersingh' }),
        expect.objectContaining({ studentId: 2, classId: 'A', FirstName: 'John', LastName: 'Smith' }),
        expect.objectContaining({ studentId: 2, classId: 'B', FirstName: 'Jane', LastName: 'Doe' }),
      ]),
    );

    // Validate limit and nextToken
    const listStudentsResultWithLimit = await listStudents(2);
    expect(listStudentsResultWithLimit.data.listStudents.items.length).toEqual(2);
    expect(listStudentsResultWithLimit.data.listStudents.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ studentId: 1, classId: 'B', FirstName: 'Chris', LastName: 'Sundersingh' }),
        expect.objectContaining({ studentId: 2, classId: 'A', FirstName: 'John', LastName: 'Smith' }),
      ]),
    );
    expect(listStudentsResultWithLimit.data.listStudents.nextToken).toBeDefined();

    const listStudentsResultWithNextToken = await listStudents(2, listStudentsResultWithLimit.data.listStudents.nextToken);
    expect(listStudentsResultWithNextToken.data.listStudents.items.length).toEqual(1);
    expect(listStudentsResultWithNextToken.data.listStudents.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ studentId: 2, classId: 'B', FirstName: 'Jane', LastName: 'Doe' })]),
    );
    expect(listStudentsResultWithNextToken.data.listStudents.nextToken).toBeNull();

    // Validate filter
    const listStudentsResultWithFilter = await listStudents(10, null, {
      and: [{ FirstName: { eq: 'John' } }, { LastName: { eq: 'Smith' } }],
    });
    expect(listStudentsResultWithFilter.data.listStudents.items.length).toEqual(1);
    expect(listStudentsResultWithFilter.data.listStudents.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ studentId: 2, classId: 'A', FirstName: 'John', LastName: 'Smith' })]),
    );
    expect(listStudentsResultWithFilter.data.listStudents.nextToken).toBeNull();

    const listStudentsResultWithFilter2 = await listStudents(10, null, { FirstName: { size: { eq: 4 } } });
    expect(listStudentsResultWithFilter2.data.listStudents.items.length).toEqual(2);
    expect(listStudentsResultWithFilter2.data.listStudents.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ studentId: 2, classId: 'A', FirstName: 'John', LastName: 'Smith' }),
        expect.objectContaining({ studentId: 2, classId: 'A', FirstName: 'John', LastName: 'Smith' }),
      ]),
    );
  });

  test('check invalid CRUD operation returns generic error message', async () => {
    const contact1 = await createContact('David', 'Smith');
    expect(contact1.data.createContact.id).toBeDefined();

    try {
      await createContact('Jason', 'Bourne', contact1.data.createContact.id);
    }
    catch (err) {
      checkGenericError(err?.message);
    }

    const nonExistentId = 'doesnotexist';
    try {
      await updateContact(nonExistentId, 'David', 'Jones');
    }
    catch (err) {
      checkGenericError(err?.message);
    }

    try {
      await deleteContact(nonExistentId);
    }
    catch (err) {
      checkGenericError(err?.message);
    }
  });

  // CURDL on Contact table helpers
  const createContact = async (firstName: string, lastName: string, id?: string) => {
    const createMutation = /* GraphQL */ `
      mutation CreateContact($input: CreateContactInput!, $condition: ModelContactConditionInput) {
        createContact(input: $input, condition: $condition) {
          id
          FirstName
          LastName
        }
      }
    `;
    const createInput = {
      input: {
        FirstName: firstName,
        LastName: lastName,
      },
    };

    if (id) {
      createInput.input['id'] = id;
    }

    const createResult: any = await appSyncClient.mutate({
      mutation: gql(createMutation),
      fetchPolicy: 'no-cache',
      variables: createInput,
    });

    return createResult;
  };

  const updateContact = async (id: string, firstName: string, lastName: string) => {
    const updateMutation = /* GraphQL */ `
      mutation UpdateContact($input: UpdateContactInput!, $condition: ModelContactConditionInput) {
        updateContact(input: $input, condition: $condition) {
          id
          FirstName
          LastName
        }
      }
    `;
    const updateInput = {
      input: {
        id,
        FirstName: firstName,
        LastName: lastName,
      },
    };
    const updateResult: any = await appSyncClient.mutate({
      mutation: gql(updateMutation),
      fetchPolicy: 'no-cache',
      variables: updateInput,
    });

    return updateResult;
  };

  const deleteContact = async (id: string) => {
    const deleteMutation = /* GraphQL */ `
      mutation DeleteContact($input: DeleteContactInput!, $condition: ModelContactConditionInput) {
        deleteContact(input: $input, condition: $condition) {
          id
          FirstName
          LastName
        }
      }
    `;
    const deleteInput = {
      input: {
        id,
      },
    };
    const deleteResult: any = await appSyncClient.mutate({
      mutation: gql(deleteMutation),
      fetchPolicy: 'no-cache',
      variables: deleteInput,
    });

    return deleteResult;
  };

  const getContact = async (id: string) => {
    const getQuery = /* GraphQL */ `
      query GetContact($id: String!) {
        getContact(id: $id) {
          id
          FirstName
          LastName
        }
      }
    `;
    const getInput = {
      id,
    };
    const getResult: any = await appSyncClient.query({
      query: gql(getQuery),
      fetchPolicy: 'no-cache',
      variables: getInput,
    });

    return getResult;
  };

  const listContacts = async () => {
    const listQuery = /* GraphQL */ `
      query ListContact {
        listContacts {
          items {
            id
            FirstName
            LastName
          }
        }
      }
    `;
    const listResult: any = await appSyncClient.query({
      query: gql(listQuery),
      fetchPolicy: 'no-cache',
    });

    return listResult;
  };

  // CURDL on Student table helpers
  const createStudent = async (studentId: number, classId: string, firstName: string, lastName: string) => {
    const createMutation = /* GraphQL */ `
      mutation CreateStuden($input: CreateStudentInput!, $condition: ModelStudentConditionInput) {
        createStudent(input: $input, condition: $condition) {
          studentId
          classId
          FirstName
          LastName
        }
      }
    `;
    const createInput = {
      input: {
        studentId,
        classId,
        FirstName: firstName,
        LastName: lastName,
      },
    };
    const createResult: any = await appSyncClient.mutate({
      mutation: gql(createMutation),
      fetchPolicy: 'no-cache',
      variables: createInput,
    });

    return createResult;
  };

  const updateStudent = async (studentId: number, classId: string, firstName: string, lastName: string) => {
    const updateMutation = /* GraphQL */ `
      mutation UpdateStudent($input: UpdateStudentInput!, $condition: ModelStudentConditionInput) {
        updateStudent(input: $input, condition: $condition) {
          studentId
          classId
          FirstName
          LastName
        }
      }
    `;
    const updateInput = {
      input: {
        studentId,
        classId,
        FirstName: firstName,
        LastName: lastName,
      },
    };
    const updateResult: any = await appSyncClient.mutate({
      mutation: gql(updateMutation),
      fetchPolicy: 'no-cache',
      variables: updateInput,
    });

    return updateResult;
  };

  const deleteStudent = async (studentId: number, classId: string) => {
    const deleteMutation = /* GraphQL */ `
      mutation DeleteStudent($input: DeleteStudentInput!, $condition: ModelStudentConditionInput) {
        deleteStudent(input: $input, condition: $condition) {
          studentId
          classId
          FirstName
          LastName
        }
      }
    `;
    const deleteInput = {
      input: {
        studentId,
        classId,
      },
    };
    const deleteResult: any = await appSyncClient.mutate({
      mutation: gql(deleteMutation),
      fetchPolicy: 'no-cache',
      variables: deleteInput,
    });

    return deleteResult;
  };

  const getStudent = async (studentId: number, classId: string) => {
    const getQuery = /* GraphQL */ `
      query GetStudent($studentId: Int!, $classId: String!) {
        getStudent(studentId: $studentId, classId: $classId) {
          studentId
          classId
          FirstName
          LastName
        }
      }
    `;
    const getInput = {
      studentId,
      classId,
    };
    const getResult: any = await appSyncClient.query({
      query: gql(getQuery),
      fetchPolicy: 'no-cache',
      variables: getInput,
    });

    return getResult;
  };

  const listStudents = async (limit: number = 100, nextToken: string | null = null, filter: any = null) => {
    const listQuery = /* GraphQL */ `
      query ListStudents($limit: Int, $nextToken: String, $filter: ModelStudentFilterInput) {
        listStudents(limit: $limit, nextToken: $nextToken, filter: $filter) {
          items {
            studentId
            classId
            FirstName
            LastName
          }
          nextToken
        }
      }
    `;
    const listResult: any = await appSyncClient.query({
      query: gql(listQuery),
      fetchPolicy: 'no-cache',
      variables: {
        limit,
        nextToken,
        filter,
      },
    });

    return listResult;
  };

  const checkGenericError = async (errorMessage?: string) => {
    expect(errorMessage).toBeDefined();
    expect(errorMessage).toEqual('GraphQL error: Error processing the request. Check the logs for more details.');
  };
});
