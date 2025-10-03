# Q Development TODO

## Executive Summary

**AWS SDK v2 → v3 Migration Status**: 90% complete, 1 package remaining

**Completed**: 4 packages (amplify-util-mock, amplify-dynamodb-simulator, amplify-e2e-tests, amplify-e2e-core)
**In Progress**: 2 packages (amplify-category-api - 95% complete, graphql-transformers-e2e-tests - 85% complete)
**Remaining**: 1 package (graphql-relational-schema-transformer - deferred)

**Estimated Completion**: 1-2 days (primarily completing test file updates and E2E validation)

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

**Status: Phase 2 Migration Nearly Complete ⚡**

- [ ] **amplify-category-api migration** - 95% COMPLETE
  - ✅ Core RDS/SecretsManager client migration completed
  - ✅ All local tests passing
  - ⏸️ SSM-related work deferred per user request
  - **Ready for E2E testing**
- [ ] **graphql-transformers-e2e-tests migration** - 85% COMPLETE
  - ✅ Core utility files migrated (IAMHelper, CloudFormationClient, S3Client, cognitoUtils)
  - ✅ Import statements updated across test suite
  - ✅ Client type references updated
  - 🔄 Resolving S3Client naming conflicts in test files
  - **Estimated**: 0.5 days to complete remaining test file updates

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

**Remaining Work:**

- [ ] **Complete graphql-transformers-e2e-tests migration** - HIGH PRIORITY

  - Fix S3Client naming conflicts in test files (AWS S3Client vs local S3Client wrapper)
  - Complete remaining test file updates
  - **Estimated timeline**: 0.5 days

- [ ] **E2E Testing Phase** - HIGH PRIORITY

  - Run E2E tests for amplify-category-api
  - Run E2E tests for graphql-transformers-e2e-tests
  - **Estimated timeline**: 1-2 days (test execution + any fixes)

- [ ] **graphql-relational-schema-transformer** - DEFERRED
  - **LOC to migrate**: 1 import line + ~5-8 RDS Data API client usage lines
  - **Complexity**: Low (single service: RDS Data API)
  - **Files**: AuroraDataAPIClient.ts
  - **Estimated timeline**: 0.25 days coding + 0.5 days E2E validation

**Total Remaining Work**: ~0.5-1 day coding + 1-2 days E2E validation

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

## Context Notes

### Critical Rule

**CANNOT mark any package migration complete until E2E tests are passing**

### Current Status Summary

- **4 packages completed and merged** (amplify-util-mock, amplify-dynamodb-simulator, amplify-e2e-tests, amplify-e2e-core)
- **2 packages nearly complete** (amplify-category-api 95%, graphql-transformers-e2e-tests 85%)
- **1 package deferred** (graphql-relational-schema-transformer - SSM work)

### Migration Progress Details

**amplify-category-api (95% complete):**

- ✅ RDS client migration (DescribeDBClustersCommand)
- ✅ SecretsManager client migration (ListSecretsCommand)
- ✅ RDSData client migration (ExecuteStatementCommand)
- ✅ All local tests passing
- ⏸️ SSM client work deferred per user request

**graphql-transformers-e2e-tests (85% complete):**

- ✅ Core utility files migrated (IAMHelper, CloudFormationClient, S3Client, cognitoUtils)
- ✅ Import statements updated across 30+ test files
- ✅ Client type references updated (CognitoIdentityProviderClient, CognitoIdentityClient)
- 🔄 Resolving S3Client naming conflicts (AWS S3Client vs local wrapper)

### Remaining Work

- Complete S3Client naming conflict resolution in test files
- Run E2E tests to validate migrations
- Address any E2E test failures

### Technical Considerations

- DynamoDB client migration patterns established and working
- AWS SDK v3 response format includes $metadata (tests updated accordingly)
- v3 returns promises directly (no .promise() calls needed)
- Credentials format changed from flat properties to credentials object
- **Jest compatibility resolved using workspace yarn.lock with compatible AWS SDK versions**

### Context

As-needed, use the `.q/` folder for larger chunks of _task specific_ context. This also means that when starting a task, check for related context in `.q/`. Look for filenames, check READMEs, or `grep` to determine what is related.
