# Q Development TODO

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

- [ ] **AWS SDK v2 to v3 Migration Analysis** (Priority: High)
  - [ ] Create comprehensive AWS SDK usage inventory
  - [ ] Identify v2 vs v3 usage patterns across packages
  - [ ] Design migration strategy with minimal breaking changes

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

- [ ] **Core Infrastructure Migration**

  - [ ] Migrate amplify-e2e-core package (already partially migrated)
  - [ ] Update shared utilities and common patterns
  - [ ] Establish v3 SDK patterns and best practices

- [ ] **Package-by-Package Migration**

  - [ ] Migrate amplify-util-mock (high v2 usage)
  - [ ] Migrate amplify-category-api (mixed usage)
  - [ ] Update container templates and Lambda functions
  - [ ] Migrate remaining transformer packages

- [ ] **Testing & Validation**

  - [ ] Update all test files and mocks
  - [ ] Validate E2E test compatibility
  - [ ] Performance testing and optimization

- [ ] **Documentation & Cleanup**
  - [ ] Update documentation and examples
  - [ ] Remove v2 dependencies completely
  - [ ] Update CI/CD configurations

## Completed

- [x] Created development guidelines (2025-09-12) - Established patterns for AI-assisted development with task decomposition, context management, and quality gates
- [x] Set up Q workspace (2025-09-12) - Created .q/ folder structure with tasks/, designs/, context/ directories and templates
- [x] Initial codebase analysis (2025-09-12) - Identified mixed v2/v3 usage, key packages, and migration scope
- [x] Created migration strategy (2025-09-12) - Comprehensive 5-phase plan with technical patterns and risk mitigation

## Context Notes

### Migration Strategy

- **Incremental approach**: Migrate package by package to enable manageable PRs
- **Backward compatibility**: Maintain existing APIs during transition
- **Mixed state support**: Some packages already use v3 (amplify-e2e-core, amplify-category-api partially)
- **High-impact areas**: amplify-util-mock, container templates, Lambda functions

### Key Findings

- Root package.json has aws-sdk v2 in resolutions (^2.1141.0)
- amplify-e2e-core already fully migrated to v3
- amplify-category-api has mixed usage (both v2 and v3)
- amplify-util-mock heavily uses v2 (DynamoDB, testing utilities)
- Container templates and Lambda functions use v2
- Some transformer packages may have indirect v2 dependencies

### Technical Considerations

- DynamoDB client migration is most complex (heavily used in mocking)
- Lambda function templates need careful migration (runtime compatibility)
- Test utilities and mocks need comprehensive updates
- Peer dependencies and version conflicts need resolution
