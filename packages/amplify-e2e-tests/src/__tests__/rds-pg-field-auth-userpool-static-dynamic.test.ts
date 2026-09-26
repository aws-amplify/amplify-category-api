import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { tryScheduleCredentialRefresh } from 'amplify-category-api-e2e-core';
import { testRdsUserpoolStaticAndDynamicFieldAuth } from '../rds-v2-tests-common/rds-auth-userpool-static-dynamic-fields';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

jest.setTimeout(90 * 60 * 1000); // 90 minutes
tryScheduleCredentialRefresh();

describe('RDS Postgres userpool static & dynamic field auth rules', () => {
  testRdsUserpoolStaticAndDynamicFieldAuth(ImportedRDSType.POSTGRESQL, []);
});
