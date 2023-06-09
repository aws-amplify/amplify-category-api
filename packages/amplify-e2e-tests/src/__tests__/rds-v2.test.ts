import {
  createRDSInstance,
  addRDSPortInboundRule,
  RDSTestDataProvider,
  removeRDSPortInboundRule,
  deleteDBInstance,
} from 'amplify-category-api-e2e-core';
import axios from 'axios';
import generator from 'generate-password';

describe('RDS Tests', () => {
  let publicIpCidr = '0.0.0.0/0';
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

  beforeAll(async () => {
    // Get the public IP of the machine running the test
    const url = 'http://api.ipify.org/';
    const response = await axios(url);
    publicIpCidr = `${response.data.trim()}/32`;
  });

  it('create database, setup initial tables and delete database', async () => {
    // This test performs the below
    // 1. Create a RDS Instance
    // 2. Add the external IP address of the current machine to security group inbound rule to allow public access
    // 3. Connect to the database and execute DDL
    // 4. Remove the IP address from the security group
    // 5. Delete the RDS instance

    const username = db_user;
    const password = db_password;
    const region = 'us-east-1';
    const identifier = `integtest${db_identifier}`;
    const db = await createRDSInstance({
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

    await removeRDSPortInboundRule({
      region,
      port: db.port,
      cidrIp: publicIpCidr,
    });
    await deleteDBInstance(identifier, region);
  });
});
