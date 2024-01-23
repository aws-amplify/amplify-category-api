import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testRdsUserpoolIAMFieldAuth } from '../rds-v2-tests-common/rds-auth-userpool-iam-fields';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS MySQL Lambda Authorizer field auth rules', () => {
  testRdsUserpoolIAMFieldAuth(ImportedRDSType.POSTGRESQL, []);
});
