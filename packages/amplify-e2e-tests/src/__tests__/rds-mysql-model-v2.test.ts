import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testRDSModel } from '../rds-v2-tests-common/rds-model-v2';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS MySQL Model Directive', () => {
  const queries = [
    'CREATE TABLE Contact (id VARCHAR(40) PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50))',
    'CREATE TABLE Person (personId INT PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50))',
    'CREATE TABLE Employee (id INT PRIMARY KEY, firstName VARCHAR(20), lastName VARCHAR(50))',
    'CREATE TABLE Student (studentId INT NOT NULL, classId CHAR(1) NOT NULL, firstName VARCHAR(20), lastName VARCHAR(50), PRIMARY KEY (studentId, classId))',
  ];

  testRDSModel(ImportedRDSType.MYSQL, queries);
});
