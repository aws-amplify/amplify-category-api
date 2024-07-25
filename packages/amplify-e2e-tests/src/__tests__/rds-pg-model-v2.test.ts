import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testRDSModel } from '../rds-v2-tests-common/rds-model-v2';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Postgres Model Directive', () => {
  const queries = [
    'CREATE TABLE "Contact" (id text PRIMARY KEY, "firstName" text, "lastName" text)',
    'CREATE TABLE "Person" ("personId" integer PRIMARY KEY, "firstName" text, "lastName" text)',
    'CREATE TABLE "Employee" (id integer PRIMARY KEY, "firstName" text, "lastName" text)',
    'CREATE TABLE "Student" ("studentId" integer NOT NULL, "classId" text NOT NULL, "firstName" text, "lastName" text, PRIMARY KEY ("studentId", "classId"))',
  ];

  testRDSModel(ImportedRDSType.POSTGRESQL, queries);
});
