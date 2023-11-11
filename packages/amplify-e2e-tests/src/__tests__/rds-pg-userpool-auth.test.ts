import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testUserPoolAuth } from '../rds-v2-tests-common/rds-auth-userpool';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Postgres UserPool Auth', () => {
  testUserPoolAuth(ImportedRDSType.POSTGRESQL);
});
