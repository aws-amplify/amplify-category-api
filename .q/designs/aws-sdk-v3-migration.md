# AWS SDK v2 to v3 Migration Design

## Overview

This document outlines the strategic migration from AWS SDK v2 to v3 across the Amplify API Category repository. The migration will be done incrementally to ensure stability and enable manageable pull requests.

## Current State Analysis

### Packages with AWS SDK Usage

1. **amplify-e2e-core** - ✅ Already migrated to v3

   - Uses @aws-sdk/client-\* packages
   - Modern credential providers
   - Good reference implementation

2. **amplify-category-api** - 🔄 Mixed usage

   - Has both v2 (`aws-sdk`) and v3 (`@aws-sdk/client-*`) dependencies
   - VPC utils already use v3 (EC2Client)
   - RDS resources need migration
   - Container templates use v2

3. **amplify-util-mock** - ❌ Heavy v2 usage

   - DynamoDB utilities extensively use v2
   - Test utilities and mocks use v2
   - E2E tests use v2

4. **Container Templates & Lambda Functions** - ❌ v2 usage
   - Express container templates
   - GraphQL resolvers
   - Pre-deploy and pipeline Lambda functions

## Migration Strategy

### Phase 1: Analysis & Planning

**Goal**: Complete understanding of migration scope and impact

**Tasks**:

- [ ] Create comprehensive inventory of all AWS SDK usage
- [ ] Map service usage patterns (DynamoDB, EC2, IAM, Lambda, etc.)
- [ ] Identify shared utilities that can be migrated first
- [ ] Document breaking changes and compatibility requirements

**Deliverables**:

- Complete usage inventory spreadsheet
- Migration impact assessment
- Shared utility migration plan

### Phase 2: Core Infrastructure Migration

**Goal**: Establish v3 patterns and migrate shared components

**Tasks**:

- [ ] Complete amplify-category-api migration (finish mixed usage)
- [ ] Create v3 utility patterns and helpers
- [ ] Update shared DynamoDB utilities
- [ ] Establish testing patterns for v3

**Deliverables**:

- Fully migrated amplify-category-api package
- V3 utility library/patterns
- Updated testing utilities

### Phase 3: Package-by-Package Migration

**Goal**: Migrate remaining packages systematically

**Priority Order**:

1. **amplify-util-mock** (highest impact)
2. **Container templates** (dockerfile-rest-express, graphql-express, etc.)
3. **Lambda functions** (predeploy.js, pipeline.js)
4. **Transformer packages** (if any indirect dependencies)

**Per-package approach**:

- Update package.json dependencies
- Migrate import statements
- Update client instantiation patterns
- Update method calls (promise() → direct await)
- Update error handling
- Update tests and mocks

### Phase 4: Testing & Validation

**Goal**: Ensure migration doesn't break functionality

**Tasks**:

- [ ] Update all test files and mocks
- [ ] Run comprehensive E2E test suite
- [ ] Performance comparison testing
- [ ] Validate container template functionality

### Phase 5: Documentation & Cleanup

**Goal**: Complete migration and remove v2 dependencies

**Tasks**:

- [ ] Remove aws-sdk v2 from all package.json files
- [ ] Update root package.json resolutions
- [ ] Update documentation and examples
- [ ] Update CI/CD configurations if needed

## Technical Migration Patterns

### Client Instantiation

**v2 Pattern**:

```typescript
import { DynamoDB } from 'aws-sdk';
const dynamodb = new DynamoDB({ region: 'us-east-1' });
```

**v3 Pattern**:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
```

### Method Calls

**v2 Pattern**:

```typescript
const result = await dynamodb.listTables().promise();
```

**v3 Pattern**:

```typescript
import { ListTablesCommand } from '@aws-sdk/client-dynamodb';
const result = await dynamodb.send(new ListTablesCommand({}));
```

### Error Handling

**v2 Pattern**:

```typescript
try {
  const result = await dynamodb.getItem(params).promise();
} catch (error) {
  if (error.code === 'ResourceNotFoundException') {
    // handle
  }
}
```

**v3 Pattern**:

```typescript
import { ResourceNotFoundException } from '@aws-sdk/client-dynamodb';
try {
  const result = await dynamodb.send(new GetItemCommand(params));
} catch (error) {
  if (error instanceof ResourceNotFoundException) {
    // handle
  }
}
```

## Risk Mitigation

### Breaking Changes

- **Lambda Runtime Compatibility**: Ensure v3 works in Lambda environments
- **Bundle Size**: Monitor impact on container templates and Lambda functions
- **Performance**: Compare v3 performance with v2 baseline

### Rollback Strategy

- Maintain feature branches for each package migration
- Keep comprehensive test coverage
- Document any behavioral differences

### Testing Strategy

- Unit tests for each migrated utility
- Integration tests for service interactions
- E2E tests for full workflow validation
- Performance benchmarks

## Package Dependency Strategy

### Root Level Changes

```json
{
  "resolutions": {
    "aws-sdk": "REMOVE",
    "@aws-sdk/client-dynamodb": "^3.624.0",
    "@aws-sdk/client-ec2": "^3.624.0",
    "@aws-sdk/client-iam": "^3.624.0",
    "@aws-sdk/client-lambda": "^3.624.0",
    "@aws-sdk/client-rds": "^3.624.0",
    "@aws-sdk/client-sts": "^3.624.0"
  }
}
```

### Package-Level Dependencies

- Remove `aws-sdk` from all package.json files
- Add specific `@aws-sdk/client-*` packages as needed
- Update devDependencies for testing utilities

## Success Criteria

1. **Zero aws-sdk v2 dependencies** in any package.json
2. **All tests passing** after migration
3. **E2E tests successful** with v3 SDK
4. **No performance regression** > 10%
5. **Container templates functional** with v3 SDK
6. **Lambda functions working** in deployed environments

## Timeline Estimate

- **Phase 1**: 2-3 days (analysis and planning)
- **Phase 2**: 3-4 days (core infrastructure)
- **Phase 3**: 5-7 days (package migrations)
- **Phase 4**: 2-3 days (testing and validation)
- **Phase 5**: 1-2 days (cleanup and documentation)

**Total**: ~2-3 weeks for complete migration

## Next Steps

1. Begin with Phase 1 analysis
2. Create detailed package inventory
3. Start with amplify-category-api completion
4. Proceed systematically through remaining packages
