import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testApiKeyLambdaIamAuthSubscription } from '../rds-v2-tests-common/rds-auth-apikey-lambda-iam-subscription';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('MySQL ApiKey, IAM and Lambda Subscription Auth on Models', () => {
  const queries = [
    'CREATE TABLE Blog (id VARCHAR(40) PRIMARY KEY, content VARCHAR(255))',
    'CREATE TABLE Post (id VARCHAR(40) PRIMARY KEY, content VARCHAR(255), blogId VARCHAR(40))',
    'CREATE TABLE User (id VARCHAR(40) PRIMARY KEY, name VARCHAR(255))',
    'CREATE TABLE Profile (id VARCHAR(40) PRIMARY KEY, details VARCHAR(255), userId VARCHAR(40))',
  ];

  testApiKeyLambdaIamAuthSubscription(ImportedRDSType.MYSQL, queries);
});
