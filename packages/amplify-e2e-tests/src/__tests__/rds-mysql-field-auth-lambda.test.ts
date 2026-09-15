import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testRdsLambdaAuthorizerFieldAuth } from '../rds-v2-tests-common/rds-field-auth-lambda';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS MySQL Lambda Authorizer field auth rules', () => {
  const queries = [
    'CREATE TABLE Person1 (id INT PRIMARY KEY, firstName VARCHAR(255), lastName VARCHAR(255), ssn VARCHAR(20))',
    'CREATE TABLE Person2 (id INT PRIMARY KEY, firstName VARCHAR(255), lastName VARCHAR(255), ssn VARCHAR(20))',
    'CREATE TABLE Person3 (id INT PRIMARY KEY, firstName VARCHAR(255), lastName VARCHAR(255), ssn VARCHAR(20))',
  ];

  testRdsLambdaAuthorizerFieldAuth(ImportedRDSType.MYSQL, queries);
});
