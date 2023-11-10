import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testRDSRefersToFields } from '../rds-v2-tests-common/rds-refers-to-fields';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS MySQL RefersTo on model fields', () => {
  const queries = [
    'CREATE TABLE Blog (id VARCHAR(40) PRIMARY KEY, content VARCHAR(255))',
    'CREATE TABLE Post (id VARCHAR(40) PRIMARY KEY, content VARCHAR(255), blogId VARCHAR(40))',
    'CREATE TABLE User (id VARCHAR(40) PRIMARY KEY, name VARCHAR(255))',
    'CREATE TABLE Profile (id VARCHAR(40) PRIMARY KEY, details VARCHAR(255), userId VARCHAR(40))',
    'CREATE TABLE Task (id VARCHAR(40) PRIMARY KEY, description VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL)',
  ];

  testRDSRefersToFields(ImportedRDSType.MYSQL, queries);
});
