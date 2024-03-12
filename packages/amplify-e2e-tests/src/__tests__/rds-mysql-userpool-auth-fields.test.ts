import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testUserPoolFieldAuth } from '../rds-v2-tests-common/rds-auth-userpool-fields';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('SQL MySQL UserPool field Auth', () => {
  testUserPoolFieldAuth(ImportedRDSType.MYSQL);
});
