# Q Development TODO

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

**SSM Migration Reverted** - Conflicts with CLI package updates

**Updated Migration Plan:**

- SSM components will be handled LAST due to CLI compatibility requirements
- Proceeding with Phase 2: amplify-util-mock DynamoDB utilities migration

**Test Fix Status:**

- ✅ Fixed api_3.test.ts AppSync error message format (committed in f80900b24)
- E2E tests ready for validation after next migration phase

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

- [ ] **Phase 1: Core Utilities Migration** (amplify-util-mock) - **NEXT**

  - [ ] Migrate DynamoDB utilities (highest complexity)
  - [ ] Update test patterns and mocking infrastructure
  - [ ] Establish v3 patterns for other packages

- [ ] **Phase 2: Supporting Packages**

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

## Completed

- [x] Created development guidelines (2025-09-12)
- [x] Set up Q workspace (2025-09-12)
- [x] Initial codebase analysis (2025-09-12)
- [x] **Completed comprehensive AWS SDK inventory** (2025-09-12)
- [x] **Fixed E2E test error message format** (2025-09-16)

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
