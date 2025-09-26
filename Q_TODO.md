# Q Development TODO

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

**Status: E2E Tests Failing - Node.js Module Resolution Issue ❌**

- ✅ amplify-dynamodb-simulator migration completed and verified
- ✅ All repository tests passing (33/33 packages successful)
- ✅ All local tests passing after parent branch merge
- ✅ Fixed api_3.test.ts AppSync error message format (committed in f80900b24)
- ✅ Parent branch merge completed successfully
- ✅ **amplify-e2e-tests migration completed successfully**
  - Updated package.json dependencies from aws-sdk v2 to v3 clients
  - Migrated all AWS service imports and usage patterns
  - Updated S3, IAM, Cognito, CloudFormation, STS, Organizations, CodeBuild, and Amplify clients
  - Fixed type definitions and method calls
  - Created compatibility layer for deleteS3Bucket function
  - All TypeScript compilation successful
- ✅ Fixed TypeScript build errors with transformer version comparisons
- ✅ **E2E Tests Fixed - Version Pinning Applied**
  - **Solution**: Pinned AWS SDK v3 to ~3.600.0 (pre-node: import versions)
  - **Root Cause**: `node:stream` module resolution error in Jest environment
  - **Error**: `ENOENT: no such file or directory, open 'node:stream'`
  - **Location**: `@smithy/core/node_modules/@smithy/util-stream/dist-cjs/createBufferedReadable.js:4:23`
  - **Impact**: All test suites failing to run (4 failed, 4 total)
  - **Batch ID**: amplify-category-api-e2e-workflow:51bc58a6-aa3d-4b19-bcfd-d70e06f916b6

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

- [x] **Phase 1: Core Utilities Migration** (amplify-util-mock) - **COMPLETED**

  - [x] Migrate DynamoDB utilities (highest complexity)
  - [x] Update test patterns and mocking infrastructure
  - [x] Establish v3 patterns for other packages

- [x] **Phase 2: Supporting Packages** - **COMPLETED**

  - [x] Migrate amplify-dynamodb-simulator - **COMPLETED**
  - [x] Migrate amplify-e2e-tests - **COMPLETED**
  - [ ] Leverage amplify-e2e-core patterns (DEFERRED - e2e-core needs migration first)

- [ ] **Phase 3: Post-Migration Upgrades** - **HIGH PRIORITY AFTER CORE MIGRATION**

  - [ ] **Upgrade to latest AWS SDK v3 versions** (Currently pinned to ~3.600.0)
    - Add Jest moduleNameMapper for `node:` imports: `"^node:(.*)$": "$1"`
    - Upgrade to latest versions (3.896.0+) for security fixes and features
    - Test thoroughly after Jest configuration changes
    - Research and upgrade Node.js version if needed

- [ ] **Phase 4: SSM Migration** (amplify-category-api) - **DEFERRED**

  - [ ] Migrate ssmClient.ts from v2 to v3 (AFTER CLI updates)
  - [ ] Remove aws-sdk v2 dependency from package.json
  - [ ] Add @aws-sdk/client-ssm dependency

- [ ] **Phase 4: Final Cleanup**

  - [ ] Remove aws-sdk v2 from root package.json resolutions
  - [ ] Final validation and testing

- [ ] **Investigate transient STS role assumption issue in e2e tests**
  - FunctionTransformerTestsV2 failing with "NoSuchBucket" error
  - Issue appears related to test infra not properly handling STS role assumption
  - Transient because test pool includes parent account which can cause conflicts
  - Need to investigate proper role assumption patterns in test infrastructure

## Completed

- [x] Created development guidelines (2025-09-12)
- [x] Set up Q workspace (2025-09-12)
- [x] Initial codebase analysis (2025-09-12)
- [x] **Completed comprehensive AWS SDK inventory** (2025-09-12)
- [x] **Completed DynamoDB utilities migration in amplify-util-mock** (2025-01-27)
  - Migrated all test files from aws-sdk-mock to aws-sdk-client-mock
  - Updated imports from aws-sdk to @aws-sdk/client-dynamodb
  - Fixed type definitions to use proper SDK v3 enums
  - All DynamoDB tests passing with 86%+ coverage
- [x] **Completed amplify-e2e-tests migration** (2025-09-26)
  - Updated package.json to use AWS SDK v3 clients
  - Migrated 12 files with AWS SDK usage
  - Updated imports: S3, IAM, Cognito, CloudFormation, STS, Organizations, CodeBuild, Amplify
  - Fixed type definitions and method calls (removed .promise(), updated client instantiation)
  - Created compatibility layer for deleteS3Bucket function (e2e-core still uses v2)
  - Updated OAuth flow types and other Cognito-related types
  - All TypeScript compilation successful
  - **Files migrated**: cleanup-e2e-resources.ts, cleanup-stale-test-buckets.ts, authHelper.ts, utilities.ts, s3matcher.ts, iamMatcher.ts, types.ts

## Context Notes

### Important: SSM Deferred

- **SSM migration conflicts with CLI package updates**
- **SSM will be handled LAST** after CLI compatibility is resolved
- Focus shifted to amplify-util-mock DynamoDB utilities

### Remaining Migration Work

1. **amplify-e2e-tests**: Simple v2 dependency removal - **NEXT**
2. **amplify-category-api**: SSM migration (DEFERRED until CLI updates complete)

### Technical Considerations

- DynamoDB client migration patterns established and working
- AWS SDK v3 response format includes \$metadata (tests updated accordingly)
- v3 returns promises directly (no .promise() calls needed)
- Credentials format changed from flat properties to credentials object
- **Jest compatibility resolved using workspace yarn.lock with compatible AWS SDK versions**

### Context

As-needed, use the `.q/` folder for larger chunks of _task sepcific_ context. This also means that when starting a task, check for related context in `.q/`. Look for filenames, check READMEs, or `grep` to determine what is related.
