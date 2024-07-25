import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testOIDCAuth } from '../rds-v2-tests-common/rds-auth-oidc';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Postgres OIDC Auth', () => {
  testOIDCAuth(ImportedRDSType.POSTGRESQL);
});
