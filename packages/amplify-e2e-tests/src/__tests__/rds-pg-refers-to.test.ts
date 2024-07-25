import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testRDSRefersTo } from '../rds-v2-tests-common/rds-refers-to';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Postgres RefersTo on Models', () => {
  const queries = [
    'CREATE TABLE "Blog" (id text PRIMARY KEY, content text)',
    'CREATE TABLE "Post" (id text PRIMARY KEY, content text, "blogId" text)',
    'CREATE TABLE "User" (id text PRIMARY KEY, name text)',
    'CREATE TABLE "Profile" (id text PRIMARY KEY, details text, "userId" text)',
    'CREATE TABLE "Task" (id text PRIMARY KEY, description text)',
  ];

  testRDSRefersTo(ImportedRDSType.POSTGRESQL, queries);
});
