import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { testRdsUserpoolStaticAndDynamicFieldAuth } from '../rds-v2-tests-common/rds-auth-userpool-static-dynamic-fields';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS MySQL userpool static & dynamic field auth rules', () => {
  testRdsUserpoolStaticAndDynamicFieldAuth(ImportedRDSType.MYSQL, []);
});
