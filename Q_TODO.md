# Q Development TODO

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

**Status: E2E Tests Failing - Migration In Progress ❌**

- ✅ amplify-util-mock migration completed and verified
- ✅ amplify-dynamodb-simulator migration completed and verified
- ✅ All local repository tests passing
- [ ] **amplify-e2e-tests migration** - IN PROGRESS (E2E TESTS FAILING)
  - Migration work partially done but E2E tests are not passing
  - **CANNOT mark complete until E2E tests pass**
- [ ] **amplify-e2e-core migration** - IN PROGRESS (E2E TESTS FAILING)
  - Migration work partially done but E2E tests are not passing
  - **CANNOT mark complete until E2E tests pass**

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

**Packages Still Requiring Migration:**

- [ ] **amplify-e2e-tests migration** - IN PROGRESS (E2E TESTS FAILING)

  - Migration work partially done but E2E tests are not passing
  - **CANNOT mark complete until E2E tests pass**
  - **Estimated timeline**: 1-2 days (debugging + 2-3 E2E test iterations)

- [ ] **amplify-e2e-core migration** - IN PROGRESS (E2E TESTS FAILING)

  - Migration work partially done but E2E tests are not passing
  - **CANNOT mark complete until E2E tests pass**
  - **Estimated timeline**: 1-2 days (debugging + 2-3 E2E test iterations)

- [ ] **amplify-category-api** - HIGH PRIORITY

  - **LOC to migrate**: 3 import lines + ~10-15 client usage lines
  - **Complexity**: Medium (SSM client patterns, .promise() removal, type updates)
  - **Files**: ssmClient.ts, appSync-rds-walkthrough.ts, ssmClient.test.ts
  - **Estimated timeline**: 0.5 days coding + 1 day E2E validation

- [ ] **graphql-transformers-e2e-tests** - HIGH PRIORITY

  - **LOC to migrate**: 25+ import lines + extensive client usage in tests
  - **Complexity**: High (multiple AWS services: Cognito, S3, IAM, Lambda, CloudFormation)
  - **Files**: 7 utility files + 20+ test files
  - **Services**: CognitoIdentity, CognitoIdentityServiceProvider, S3, IAM, Lambda, CloudFormation
  - **Estimated timeline**: 2-3 days coding + 2-3 days E2E validation

- [ ] **graphql-relational-schema-transformer** - MEDIUM PRIORITY
  - **LOC to migrate**: 1 import line + ~5-8 RDS Data API client usage lines
  - **Complexity**: Low (single service: RDS Data API)
  - **Files**: AuroraDataAPIClient.ts
  - **Estimated timeline**: 0.25 days coding + 0.5 days E2E validation

**Total Migration Scope**: ~32 import lines + ~50-75 client usage lines across 30+ files
**Total Estimated Timeline**: 5-8 days (factoring E2E test iterations)

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

## Context Notes

### Critical Rule

**CANNOT mark any package migration complete until E2E tests are passing**

### Current Status Summary

- **2 packages have partial migrations** (amplify-e2e-tests, amplify-e2e-core) - IN PROGRESS
- **3 packages still need full migration** (amplify-category-api, graphql-transformers-e2e-tests, graphql-relational-schema-transformer)
- **E2E tests are currently failing** - this blocks completion of any migration work

### Remaining Migration Scope

- **amplify-category-api**: 3 files (SSM client usage)
- **graphql-transformers-e2e-tests**: 30+ files (extensive AWS SDK usage across test infrastructure)
- **graphql-relational-schema-transformer**: 1 file (Aurora Data API client)

### Technical Considerations

- DynamoDB client migration patterns established and working
- AWS SDK v3 response format includes $metadata (tests updated accordingly)
- v3 returns promises directly (no .promise() calls needed)
- Credentials format changed from flat properties to credentials object
- **Jest compatibility resolved using workspace yarn.lock with compatible AWS SDK versions**

### Context

As-needed, use the `.q/` folder for larger chunks of _task specific_ context. This also means that when starting a task, check for related context in `.q/`. Look for filenames, check READMEs, or `grep` to determine what is related.
