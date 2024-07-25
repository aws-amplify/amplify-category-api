import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testRdsIAMFieldAuth } from '../rds-v2-tests-common/rds-field-auth-iam';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS MySQL IAM Mode field auth rules', () => {
  const queries = [
    'CREATE TABLE Person1 (id INT PRIMARY KEY, firstName VARCHAR(255), lastName VARCHAR(255), ssn VARCHAR(20))',
    'CREATE TABLE Person2 (id INT PRIMARY KEY, firstName VARCHAR(255), lastName VARCHAR(255), ssn VARCHAR(20))',
    'CREATE TABLE Person3 (id INT PRIMARY KEY, firstName VARCHAR(255), lastName VARCHAR(255), ssn VARCHAR(20))',
    'CREATE TABLE Person4 (id INT PRIMARY KEY, firstName VARCHAR(255), lastName VARCHAR(255), ssn VARCHAR(20))',
  ];

  testRdsIAMFieldAuth(ImportedRDSType.MYSQL, queries);
});
