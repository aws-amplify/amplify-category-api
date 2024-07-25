import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testCustomClaimsRefersTo } from '../rds-v2-tests-common/rds-auth-custom-claims-refersto-auth';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Postgres Custom Claims Auth With RefersTo', () => {
  testCustomClaimsRefersTo(ImportedRDSType.POSTGRESQL);
});
