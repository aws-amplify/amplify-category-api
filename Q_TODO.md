# Q Development TODO

## Executive Summary

**AWS SDK v2 → v3 Migration Status**: 80% complete, 3 packages remaining

**Completed**: 4 packages (amplify-util-mock, amplify-dynamodb-simulator, amplify-e2e-tests, amplify-e2e-core)
**In Progress**: 2 packages (amplify-category-api, graphql-transformers-e2e-tests)
**Remaining**: 1 package (graphql-relational-schema-transformer)

**Estimated Completion**: 3-5 days (primarily E2E test iteration time, not coding complexity)

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

**Status: Phase 2 Migration In Progress ⚡**

- [ ] **amplify-category-api migration** - IN PROGRESS
  - SSM client migration (3 files, ~15 lines)
  - **Note**: SSM-related work deferred per user request
- [ ] **graphql-transformers-e2e-tests migration** - IN PROGRESS
  - Multi-service migration (30+ files, extensive AWS SDK usage)

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

**Packages Still Requiring Migration:**

- [ ] **graphql-relational-schema-transformer** - DEFERRED
  - **LOC to migrate**: 1 import line + ~5-8 RDS Data API client usage lines
  - **Complexity**: Low (single service: RDS Data API)
  - **Files**: AuroraDataAPIClient.ts
  - **Estimated timeline**: 0.25 days coding + 0.5 days E2E validation

**Total Migration Scope**: ~32 import lines + ~50-75 client usage lines across 30+ files
**Total Estimated Timeline**: 3-5 days (factoring E2E test iterations)

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
- **2 packages in active migration** (amplify-category-api, graphql-transformers-e2e-tests)
- **1 package deferred** (graphql-relational-schema-transformer - SSM work)

### Remaining Migration Scope

- **amplify-category-api**: 3 files (SSM client usage) - SSM work deferred per user request
- **graphql-transformers-e2e-tests**: 30+ files (extensive AWS SDK usage across test infrastructure)
- **graphql-relational-schema-transformer**: 1 file (Aurora Data API client) - deferred

### Technical Considerations

- DynamoDB client migration patterns established and working
- AWS SDK v3 response format includes $metadata (tests updated accordingly)
- v3 returns promises directly (no .promise() calls needed)
- Credentials format changed from flat properties to credentials object
- **Jest compatibility resolved using workspace yarn.lock with compatible AWS SDK versions**

### Context

As-needed, use the `.q/` folder for larger chunks of _task specific_ context. This also means that when starting a task, check for related context in `.q/`. Look for filenames, check READMEs, or `grep` to determine what is related.
