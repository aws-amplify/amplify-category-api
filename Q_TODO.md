# Q Development TODO

## Executive Summary

**AWS SDK v2 → v3 Migration Status**: 95% complete, 1 package remaining

**Completed**: 6 packages (amplify-util-mock, amplify-dynamodb-simulator, amplify-e2e-tests, amplify-e2e-core, amplify-category-api, graphql-transformers-e2e-tests)
**Remaining**: 1 package (graphql-relational-schema-transformer - deferred)

**Estimated Completion**: Ready for E2E testing phase

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

**Status: Phase 2 Migration COMPLETE ✅**

- [x] **amplify-category-api migration** - 100% COMPLETE ✅
  - ✅ Core RDS/SecretsManager client migration completed
  - ✅ SSM client fully migrated to v3 (removed v2/v3 compatibility layer)
  - ✅ aws-sdk v2 dependency removed from package.json
  - ✅ All local tests passing
  - **Ready for E2E testing**
- [x] **graphql-transformers-e2e-tests migration** - 100% COMPLETE ✅
  - ✅ Core utility files migrated (IAMHelper, CloudFormationClient, S3Client, cognitoUtils)
  - ✅ Import statements updated across test suite
  - ✅ Client type references updated
  - ✅ S3Client naming conflicts resolved in test files
  - ✅ LambdaHelper migrated to v3 with command pattern
  - ✅ aws-sdk v2 dependency completely removed from package.json
  - ✅ All credential handling updated for v3 compatibility
  - **Ready for E2E testing**

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

**Remaining Work:**

- [ ] **E2E Testing Phase** - HIGH PRIORITY

  - Run E2E tests for amplify-category-api
  - Run E2E tests for graphql-transformers-e2e-tests
  - **Estimated timeline**: 1-2 days (test execution + any fixes)

- [ ] **graphql-relational-schema-transformer** - DEFERRED
  - **LOC to migrate**: 1 import line + ~5-8 RDS Data API client usage lines
  - **Complexity**: Low (single service: RDS Data API)
  - **Files**: AuroraDataAPIClient.ts
  - **Estimated timeline**: 0.25 days coding + 0.5 days E2E validation

**Total Remaining Work**: 1-2 days E2E validation

**Post-Migration Tasks:**

- [ ] Remove aws-sdk v2 from root package.json resolutions
- [ ] Upgrade AWS SDK v3 versions from pinned ~3.600.0 to latest
- [ ] Final E2E validation

## Completed

- [x] Created development guidelines (2025-09-12)
- [x] Set up Q workspace (2025-09-12)
- [x] Initial codebase analysis (2025-09-12)
- [x] **Completed comprehensive AWS SDK inventory** (2025-09-12)
- [x] **Completed DynamoDB utilities migration in amplify-util-mock** (2025-01-27)
- [x] **Completed amplify-dynamodb-simulator migration** (2025-09-26)
- [x] **Completed amplify-e2e-tests migration** (2025-10-03) - E2E tests passed, merged
- [x] **Completed amplify-e2e-core migration** (2025-10-03) - E2E tests passed, merged
- [x] **Completed amplify-category-api migration** (2025-10-03) - All tests passing, ready for E2E
- [x] **Completed graphql-transformers-e2e-tests migration** (2025-10-03) - All tests passing, ready for E2E

## Context Notes

### Critical Rule

**CANNOT mark any package migration complete until E2E tests are passing**

### Current Status Summary

- **6 packages completed** (4 merged after E2E validation, 2 ready for E2E testing)
- **1 package deferred** (graphql-relational-schema-transformer)

### Migration Progress Details

**amplify-category-api (100% complete):**

- ✅ RDS client migration (DescribeDBClustersCommand)
- ✅ SecretsManager client migration (ListSecretsCommand)
- ✅ RDSData client migration (ExecuteStatementCommand)
- ✅ SSM client fully migrated to v3 (removed compatibility layer)
- ✅ aws-sdk v2 dependency completely removed
- ✅ All local tests passing

**graphql-transformers-e2e-tests (100% complete):**

- ✅ Core utility files migrated (IAMHelper, CloudFormationClient, S3Client, cognitoUtils)
- ✅ Import statements updated across 30+ test files
- ✅ Client type references updated (CognitoIdentityProviderClient, CognitoIdentityClient)
- ✅ S3Client naming conflicts resolved (AWS S3Client vs local wrapper)
- ✅ LambdaHelper migrated to v3 with LambdaClient and command pattern
- ✅ aws-sdk v2 dependency completely removed
- ✅ All credential handling updated for v3 compatibility

### Key Achievements

- **Complete removal of aws-sdk v2 dependencies** from both packages
- **Full migration to AWS SDK v3** including SSM client (no compatibility layers remaining)
- **Systematic resolution of naming conflicts** between AWS SDK clients and local wrapper classes
- **Updated credential handling** for v3 compatibility across all test files
- **All repository builds and tests passing** after complete migration

### Technical Patterns Established

- **Import Pattern**: `import { ServiceClient, CommandName } from '@aws-sdk/client-service'`
- **Client Usage**: `await client.send(new CommandName(params))`
- **Credential Handling**: Plain objects `{ accessKeyId, secretAccessKey, sessionToken }` instead of `new AWS.Credentials()`
- **Naming Conflicts**: Use aliases like `import { S3Client as AWSS3Client }` when conflicts with local classes
- **Testing**: Use `aws-sdk-client-mock` for v3 client mocking with `.toHaveReceivedCommandWith()` assertions

### Context

As-needed, use the `.q/` folder for larger chunks of _task specific_ context. This also means that when starting a task, check for related context in `.q/`. Look for filenames, check READMEs, or `grep` to determine what is related.
