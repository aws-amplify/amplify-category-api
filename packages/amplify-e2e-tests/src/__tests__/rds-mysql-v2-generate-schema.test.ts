import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testRDSGenerateSchema } from '../rds-v2-tests-common/rds-v2-generate-schema';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS MySQL Generate Schema', () => {
  const queries = [
    'CREATE TABLE Contact (id INT PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50))',
    'CREATE TABLE Person (id INT PRIMARY KEY, info JSON NOT NULL)',
    'CREATE TABLE tbl_todos (id INT PRIMARY KEY, description VARCHAR(20))',
    'CREATE TABLE Task (Id INT PRIMARY KEY, Description VARCHAR(20), task_name VARCHAR(20))',
  ];

  testRDSGenerateSchema(ImportedRDSType.MYSQL, queries);
});
