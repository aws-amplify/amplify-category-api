import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testRDSGenerateSchema } from '../rds-v2-tests-common/rds-v2-generate-schema';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Postgres Generate Schema', () => {
  const queries = [
    'CREATE TABLE "Contact" (id integer PRIMARY KEY, "firstName" text, "lastName" text)',
    'CREATE TABLE "Person" (id integer PRIMARY KEY, info jsonb NOT NULL)',
    'CREATE TABLE "tbl_todos" (id integer PRIMARY KEY, description text)',
    'CREATE TABLE "Task" ("Id" integer PRIMARY KEY, "Description" text, "task_name" text)',
  ];

  testRDSGenerateSchema(ImportedRDSType.POSTGRESQL, queries);
});
