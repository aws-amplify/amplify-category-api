# Q Development TODO

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

**Status: Ready for E2E Testing**

- ✅ All local tests passing after parent branch merge
- ✅ Fixed api_3.test.ts AppSync error message format (committed in f80900b24)
- ✅ Parent branch merge completed successfully
- 🚀 Ready to commit and run E2E tests

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

- [x] **Phase 1: Core Utilities Migration** (amplify-util-mock) - **COMPLETED**

  - [x] Migrate DynamoDB utilities (highest complexity)
  - [x] Update test patterns and mocking infrastructure
  - [x] Establish v3 patterns for other packages

- [ ] **Phase 2: Supporting Packages** - **NEXT**

  - [ ] Migrate amplify-dynamodb-simulator
  - [ ] Migrate amplify-e2e-tests
  - [ ] Leverage amplify-e2e-core patterns

- [ ] **Phase 3: SSM Migration** (amplify-category-api) - **DEFERRED**

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

## Context Notes

### Important: SSM Deferred

- **SSM migration conflicts with CLI package updates**
- **SSM will be handled LAST** after CLI compatibility is resolved
- Focus shifted to amplify-util-mock DynamoDB utilities

### Remaining Migration Work

1. **amplify-util-mock**: DynamoDB utilities need migration (main complexity) - **NEXT**
2. **amplify-dynamodb-simulator**: Simple v2 dependency removal
3. **amplify-e2e-tests**: Simple v2 dependency removal
4. **amplify-category-api**: SSM migration (DEFERRED until CLI updates complete)

### Technical Considerations

- DynamoDB client migration is the main complexity (amplify-util-mock)
- Most infrastructure already provides v3 patterns to follow
- Risk is much lower than initially assessed

### Context

As-needed, use the `.q/` folder for larger chunks of _task sepcific_ context. This also means that when starting a task, check for related context in `.q/`. Look for filenames, check READMEs, or `grep` to determine what is related.
