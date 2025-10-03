# Q Development TODO

## Executive Summary

**AWS SDK v2 → v3 Migration Status**: 85% complete, 2 packages remaining

**Completed**: 5 packages (amplify-util-mock, amplify-dynamodb-simulator, amplify-e2e-tests, amplify-e2e-core, amplify-category-api)
**In Progress**: 0 packages
**Remaining**: 2 packages requiring ~30-40 lines of migration across 25+ files

**Estimated Completion**: 2-3 days (primarily E2E test iteration time, not coding complexity)

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

**Status: amplify-category-api Migration Complete ✅**

- ✅ amplify-util-mock migration completed and verified
- ✅ amplify-dynamodb-simulator migration completed and verified
- ✅ amplify-e2e-tests migration completed and verified
- ✅ amplify-e2e-core migration completed and verified
- ✅ **amplify-category-api migration completed and verified**
  - Migrated appSync-rds-walkthrough.ts from AWS SDK v2 to v3
  - Updated ssmClient.ts to use only AWS SDK v3
  - Removed all v2 imports and .promise() calls
  - Updated error handling to use v3 format
  - All tests passing

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

**Packages Still Requiring Migration:**

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

**Total Remaining Migration Scope**: ~30 import lines + ~35-50 client usage lines across 25+ files
**Total Estimated Timeline**: 3-4 days (factoring E2E test iterations)

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
- [x] **Completed amplify-e2e-tests migration** (2025-10-03)
- [x] **Completed amplify-e2e-core migration** (2025-10-03)
- [x] **Completed amplify-category-api migration** (2025-10-03)

## Context Notes

### Critical Rule

**CANNOT mark any package migration complete until E2E tests are passing**

### Current Status Summary

- **5 packages completed** (amplify-util-mock, amplify-dynamodb-simulator, amplify-e2e-tests, amplify-e2e-core, amplify-category-api)
- **0 packages in progress**
- **2 packages remaining** (graphql-transformers-e2e-tests, graphql-relational-schema-transformer)

### Remaining Migration Scope

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
