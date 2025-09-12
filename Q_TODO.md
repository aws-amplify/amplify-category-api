# Q Development TODO

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

- [x] **Phase 1: Complete amplify-category-api Migration** (Priority: High) - COMPLETED
  - [x] Migrate ssmClient.ts from v2 to v3
  - [x] Update package.json dependencies
  - [x] Test migration works correctly

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

- [ ] **Phase 1: Complete Partial Migrations** (amplify-category-api)

  - [ ] Migrate ssmClient.ts from v2 to v3
  - [ ] Remove aws-sdk v2 dependency from package.json
  - [ ] Add @aws-sdk/client-ssm dependency

- [ ] **Phase 2: Core Utilities Migration** (amplify-util-mock)

  - [ ] Migrate DynamoDB utilities (highest complexity)
  - [ ] Update test patterns and mocking infrastructure
  - [ ] Establish v3 patterns for other packages

- [ ] **Phase 3: Supporting Packages**

  - [ ] Migrate amplify-dynamodb-simulator
  - [ ] Migrate amplify-e2e-tests
  - [ ] Leverage amplify-e2e-core patterns

- [ ] **Phase 4: Final Cleanup**
  - [ ] Remove aws-sdk v2 from root package.json resolutions
  - [ ] Final validation and testing

## Completed

- [x] Created development guidelines (2025-09-12) - Established patterns for AI-assisted development with task decomposition, context management, and quality gates
- [x] Set up Q workspace (2025-09-12) - Created .q/ folder structure with tasks/, designs/, context/ directories and templates
- [x] Initial codebase analysis (2025-09-12) - Identified mixed v2/v3 usage, key packages, and migration scope
- [x] **Completed Phase 1: amplify-category-api migration** (2025-09-12) - Migrated ssmClient.ts to v3, updated dependencies, all tests passing

## Context Notes

### Key Discovery: Migration More Advanced Than Expected

- **Container templates**: Already fully migrated to v3
- **Lambda functions**: Already fully migrated to v3
- **amplify-e2e-core**: Already fully migrated to v3 (good reference)
- **amplify-graphql-model-transformer**: Lambda functions already use v3

### Remaining Migration Work (Much Smaller Scope)

1. **amplify-category-api**: Only ssmClient.ts needs migration (1 file)
2. **amplify-util-mock**: DynamoDB utilities need migration (main complexity)
3. **amplify-dynamodb-simulator**: Simple v2 dependency removal
4. **amplify-e2e-tests**: Simple v2 dependency removal

### Technical Considerations

- DynamoDB client migration is the main complexity (amplify-util-mock)
- Most infrastructure already provides v3 patterns to follow
- Risk is much lower than initially assessed
- Estimated timeline reduced from 2-3 weeks to 1-2 weeks

### Migration Priority Refined

1. **Phase 1**: Complete amplify-category-api (1 file) - 1 day
2. **Phase 2**: Migrate amplify-util-mock DynamoDB utilities - 3-4 days
3. **Phase 3**: Simple dependency updates for simulator and e2e-tests - 1-2 days
4. **Phase 4**: Final cleanup - 1 day
