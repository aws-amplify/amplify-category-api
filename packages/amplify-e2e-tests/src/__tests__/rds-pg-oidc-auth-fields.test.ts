import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testOIDCFieldAuth } from '../rds-v2-tests-common/rds-auth-oidc-fields';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('SQL Postgres OIDC Field Auth', () => {
  testOIDCFieldAuth(ImportedRDSType.POSTGRESQL);
});
