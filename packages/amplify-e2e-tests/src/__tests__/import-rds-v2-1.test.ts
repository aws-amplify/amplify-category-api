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
  RDSTestDataProvider,
  removeRDSPortInboundRule,
  deleteDBInstance,
  removeApi
} from 'amplify-category-api-e2e-core';
import _ from 'lodash';
import { verifyAmplifyMeta, verifyCompiledSchema, setupRDSDatabase, verifyRDSSchema } from '../rds-v2-test-utils';

const [db_user, db_password, db_identifier] = generator.generateMultiple(3);
const db_name = `mysql_db_${db_identifier}`;
const region = "us-east-1";
const identifier = `integtest${db_identifier}`;
const dbConnectionInfo = {
  publicIpCidr: "0.0.0.0/0",
  port: 3306,
  host: "mock-db-host.amazonaws.com"
};
const sqlStatements = [
  "CREATE TABLE Contacts (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))",
  "CREATE TABLE Person (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))",
  "CREATE TABLE Employee (ID INT PRIMARY KEY, FirstName VARCHAR(20), LastName VARCHAR(50))"
];

describe("Import RDS V2 API Tests-1", () => {
  let dbAdapter: RDSTestDataProvider;
  let projectRoot: string;

  beforeAll(async () => {
    const { dbAdapter, dbInfo } = await setupRDSDatabase({
      username: db_user,
      password: db_password,
      database: db_name,
      identifier: identifier,
      region: region
    });
    dbConnectionInfo.port = dbInfo.port;
    dbConnectionInfo.publicIpCidr = dbInfo.publicIpCidr;
    dbConnectionInfo.host = dbInfo.host;
    await dbAdapter.runQuery(sqlStatements);
  });

  afterAll(async () => {
    dbAdapter?.cleanup();
    await removeRDSPortInboundRule({
      region,
      port: dbConnectionInfo.port,
      cidrIp: dbConnectionInfo.publicIpCidr
    });
    await deleteDBInstance(identifier, region);
  });

  beforeEach(async () => {
    projectRoot = await createNewProjectDir("import-rds-env-v2");
  });

  afterEach(async () => {
    await deleteProject(projectRoot);
    deleteProjectDir(projectRoot);
  });

  it("adds a new api if one does not already exist", async () => {
    const name = 'importnewapi';
    await initJSProjectWithProfile(projectRoot, { disableAmplifyAppCreation: false, name: name });
    await importRDSDatabase(projectRoot, {
      database: db_name,
      host: dbConnectionInfo.host,
      port: dbConnectionInfo.port,
      username: db_user,
      password: db_password,
      apiExists: false
    });
    await amplifyPush(projectRoot);

    verifyAmplifyMeta(projectRoot, name, db_name);
    verifyCompiledSchema(projectRoot, name, expectedCompiledSchema);
    verifyRDSSchema(projectRoot, name, expectedSchema);
  });

  it("uses the existing api if one exists", async () => {
    const name = 'importexistingapi';
    await initJSProjectWithProfile(projectRoot, { disableAmplifyAppCreation: false, name: name });
    await addApiWithBlankSchema(projectRoot);
    await updateApiSchema(projectRoot, name, 'simple_model.graphql');
    await importRDSDatabase(projectRoot, {
      database: db_name,
      host: dbConnectionInfo.host,
      port: dbConnectionInfo.port,
      username: db_user,
      password: db_password,
      apiExists: true
    });
    await amplifyPush(projectRoot);

    verifyAmplifyMeta(projectRoot, name, db_name);
    verifyCompiledSchema(projectRoot, name);
    verifyRDSSchema(projectRoot, name, expectedSchema);
  });

  it("removing the API clears out the imported schema file", async () => {
    const name = "wrongsecrets";
    await initJSProjectWithProfile(projectRoot, { disableAmplifyAppCreation: false, name: name });
    const dbInfo = {
      database: db_name,
      host: dbConnectionInfo.host,
      port: dbConnectionInfo.port,
      username: db_user,
      password: db_password
    };
    await importRDSDatabase(projectRoot, {
      ...dbInfo,
      apiExists: false
    });

    verifyRDSSchema(projectRoot, name, expectedSchema);
    
    // remove the API
    await removeApi(projectRoot);
    verifyRDSSchema(projectRoot, name);
  });
});

const expectedSchema: string = `
input Amplify {
  engine: String = "mysql"
  globalAuthRule: AuthRule = {allow: public}
}

type Contacts @model {
  ID: Int! @primaryKey
  FirstName: String
  LastName: String
}

type Employee @model {
  ID: Int! @primaryKey
  FirstName: String
  LastName: String
}

type Person @model {
  ID: Int! @primaryKey
  FirstName: String
  LastName: String
}
`;

const expectedCompiledSchema: string = `
type Contacts {
  ID: Int!
  FirstName: String
  LastName: String
}

type Employee {
  ID: Int!
  FirstName: String
  LastName: String
}

type Person {
  ID: Int!
  FirstName: String
  LastName: String
}

input ModelStringInput {
  ne: String
  eq: String
  le: String
  lt: String
  ge: String
  gt: String
  contains: String
  notContains: String
  between: [String]
  beginsWith: String
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
  size: ModelSizeInput
}

input ModelIntInput {
  ne: Int
  eq: Int
  le: Int
  lt: Int
  ge: Int
  gt: Int
  between: [Int]
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
}

input ModelFloatInput {
  ne: Float
  eq: Float
  le: Float
  lt: Float
  ge: Float
  gt: Float
  between: [Float]
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
}

input ModelBooleanInput {
  ne: Boolean
  eq: Boolean
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
}

input ModelIDInput {
  ne: ID
  eq: ID
  le: ID
  lt: ID
  ge: ID
  gt: ID
  contains: ID
  notContains: ID
  between: [ID]
  beginsWith: ID
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
  size: ModelSizeInput
}

input ModelSubscriptionStringInput {
  ne: String
  eq: String
  le: String
  lt: String
  ge: String
  gt: String
  contains: String
  notContains: String
  between: [String]
  beginsWith: String
  in: [String]
  notIn: [String]
}

input ModelSubscriptionIntInput {
  ne: Int
  eq: Int
  le: Int
  lt: Int
  ge: Int
  gt: Int
  between: [Int]
  in: [Int]
  notIn: [Int]
}

input ModelSubscriptionFloatInput {
  ne: Float
  eq: Float
  le: Float
  lt: Float
  ge: Float
  gt: Float
  between: [Float]
  in: [Float]
  notIn: [Float]
}

input ModelSubscriptionBooleanInput {
  ne: Boolean
  eq: Boolean
}

input ModelSubscriptionIDInput {
  ne: ID
  eq: ID
  le: ID
  lt: ID
  ge: ID
  gt: ID
  contains: ID
  notContains: ID
  between: [ID]
  beginsWith: ID
  in: [ID]
  notIn: [ID]
}

enum ModelAttributeTypes {
  binary
  binarySet
  bool
  list
  map
  number
  numberSet
  string
  stringSet
  _null
}

input ModelSizeInput {
  ne: Int
  eq: Int
  le: Int
  lt: Int
  ge: Int
  gt: Int
  between: [Int]
}

enum ModelSortDirection {
  ASC
  DESC
}

type ModelContactsConnection {
  items: [Contacts]!
  nextToken: String
}

input ModelContactsFilterInput {
  ID: ModelIntInput
  FirstName: ModelStringInput
  LastName: ModelStringInput
  and: [ModelContactsFilterInput]
  or: [ModelContactsFilterInput]
  not: ModelContactsFilterInput
}

type Query {
  getContacts(ID: Int!): Contacts
  listContacts(ID: Int, filter: ModelContactsFilterInput, limit: Int, nextToken: String, sortDirection: ModelSortDirection): ModelContactsConnection
  getEmployee(ID: Int!): Employee
  listEmployees(ID: Int, filter: ModelEmployeeFilterInput, limit: Int, nextToken: String, sortDirection: ModelSortDirection): ModelEmployeeConnection
  getPerson(ID: Int!): Person
  listPeople(ID: Int, filter: ModelPersonFilterInput, limit: Int, nextToken: String, sortDirection: ModelSortDirection): ModelPersonConnection
}

input ModelContactsConditionInput {
  FirstName: ModelStringInput
  LastName: ModelStringInput
  and: [ModelContactsConditionInput]
  or: [ModelContactsConditionInput]
  not: ModelContactsConditionInput
}

input CreateContactsInput {
  ID: Int!
  FirstName: String
  LastName: String
}

input UpdateContactsInput {
  ID: Int!
  FirstName: String
  LastName: String
}

input DeleteContactsInput {
  ID: Int!
}

type Mutation {
  createContacts(input: CreateContactsInput!, condition: ModelContactsConditionInput): Contacts
  updateContacts(input: UpdateContactsInput!, condition: ModelContactsConditionInput): Contacts
  deleteContacts(input: DeleteContactsInput!, condition: ModelContactsConditionInput): Contacts
  createEmployee(input: CreateEmployeeInput!, condition: ModelEmployeeConditionInput): Employee
  updateEmployee(input: UpdateEmployeeInput!, condition: ModelEmployeeConditionInput): Employee
  deleteEmployee(input: DeleteEmployeeInput!, condition: ModelEmployeeConditionInput): Employee
  createPerson(input: CreatePersonInput!, condition: ModelPersonConditionInput): Person
  updatePerson(input: UpdatePersonInput!, condition: ModelPersonConditionInput): Person
  deletePerson(input: DeletePersonInput!, condition: ModelPersonConditionInput): Person
}

input ModelSubscriptionContactsFilterInput {
  ID: ModelSubscriptionIntInput
  FirstName: ModelSubscriptionStringInput
  LastName: ModelSubscriptionStringInput
  and: [ModelSubscriptionContactsFilterInput]
  or: [ModelSubscriptionContactsFilterInput]
}

type Subscription {
  onCreateContacts(filter: ModelSubscriptionContactsFilterInput): Contacts @aws_subscribe(mutations: ["createContacts"])
  onUpdateContacts(filter: ModelSubscriptionContactsFilterInput): Contacts @aws_subscribe(mutations: ["updateContacts"])
  onDeleteContacts(filter: ModelSubscriptionContactsFilterInput): Contacts @aws_subscribe(mutations: ["deleteContacts"])
  onCreateEmployee(filter: ModelSubscriptionEmployeeFilterInput): Employee @aws_subscribe(mutations: ["createEmployee"])
  onUpdateEmployee(filter: ModelSubscriptionEmployeeFilterInput): Employee @aws_subscribe(mutations: ["updateEmployee"])
  onDeleteEmployee(filter: ModelSubscriptionEmployeeFilterInput): Employee @aws_subscribe(mutations: ["deleteEmployee"])
  onCreatePerson(filter: ModelSubscriptionPersonFilterInput): Person @aws_subscribe(mutations: ["createPerson"])
  onUpdatePerson(filter: ModelSubscriptionPersonFilterInput): Person @aws_subscribe(mutations: ["updatePerson"])
  onDeletePerson(filter: ModelSubscriptionPersonFilterInput): Person @aws_subscribe(mutations: ["deletePerson"])
}

type ModelEmployeeConnection {
  items: [Employee]!
  nextToken: String
}

input ModelEmployeeFilterInput {
  ID: ModelIntInput
  FirstName: ModelStringInput
  LastName: ModelStringInput
  and: [ModelEmployeeFilterInput]
  or: [ModelEmployeeFilterInput]
  not: ModelEmployeeFilterInput
}

input ModelEmployeeConditionInput {
  FirstName: ModelStringInput
  LastName: ModelStringInput
  and: [ModelEmployeeConditionInput]
  or: [ModelEmployeeConditionInput]
  not: ModelEmployeeConditionInput
}

input CreateEmployeeInput {
  ID: Int!
  FirstName: String
  LastName: String
}

input UpdateEmployeeInput {
  ID: Int!
  FirstName: String
  LastName: String
}

input DeleteEmployeeInput {
  ID: Int!
}

input ModelSubscriptionEmployeeFilterInput {
  ID: ModelSubscriptionIntInput
  FirstName: ModelSubscriptionStringInput
  LastName: ModelSubscriptionStringInput
  and: [ModelSubscriptionEmployeeFilterInput]
  or: [ModelSubscriptionEmployeeFilterInput]
}

type ModelPersonConnection {
  items: [Person]!
  nextToken: String
}

input ModelPersonFilterInput {
  ID: ModelIntInput
  FirstName: ModelStringInput
  LastName: ModelStringInput
  and: [ModelPersonFilterInput]
  or: [ModelPersonFilterInput]
  not: ModelPersonFilterInput
}

input ModelPersonConditionInput {
  FirstName: ModelStringInput
  LastName: ModelStringInput
  and: [ModelPersonConditionInput]
  or: [ModelPersonConditionInput]
  not: ModelPersonConditionInput
}

input CreatePersonInput {
  ID: Int!
  FirstName: String
  LastName: String
}

input UpdatePersonInput {
  ID: Int!
  FirstName: String
  LastName: String
}

input DeletePersonInput {
  ID: Int!
}

input ModelSubscriptionPersonFilterInput {
  ID: ModelSubscriptionIntInput
  FirstName: ModelSubscriptionStringInput
  LastName: ModelSubscriptionStringInput
  and: [ModelSubscriptionPersonFilterInput]
  or: [ModelSubscriptionPersonFilterInput]
}
`;