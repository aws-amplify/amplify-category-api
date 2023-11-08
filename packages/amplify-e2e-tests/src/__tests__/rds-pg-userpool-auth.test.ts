import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testUserPoolAuth } from '../rds-v2-tests-common/rds-userpool-auth';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Postgres UserPool Auth', () => {
  testUserPoolAuth(ImportedRDSType.POSTGRESQL);
});
