# AWS SDK v2 to v3 Migration Analysis Summary

## Executive Summary

**Current State**: Mixed migration state with 3 packages requiring migration
**Complexity**: Medium - Most container templates and Lambda functions already migrated
**Estimated Effort**: 1-2 weeks for complete migration

## Key Findings

### ✅ Already Migrated (No Action Needed)

- **amplify-e2e-core**: Fully v3, good reference implementation
- **Container templates**: All already use v3 (@aws-sdk/lib-dynamodb)
- **Lambda functions**: predeploy.js and pipeline.js already use v3
- **amplify-graphql-model-transformer**: Lambda functions use v3

### 🔄 Partially Migrated (Completion Needed)

- **amplify-category-api**: Mixed usage
  - ✅ VPC utils (vpc-utils.ts) - already v3
  - ✅ RDS database-resources.ts - already v3
  - ❌ SSM client (ssmClient.ts) - still v2
  - ❌ Main package still has aws-sdk v2 dependency

### ❌ Requires Migration (High Priority)

1. **amplify-util-mock** - Heavy v2 usage

   - DynamoDB utilities extensively use v2
   - Test utilities and mocking infrastructure
   - Multiple files with .promise() patterns

2. **amplify-dynamodb-simulator** - v2 dependency

   - Simulator integration package
   - May need coordination with simulator updates

3. **amplify-e2e-tests** - v2 dependency
   - Test package using v2
   - Should leverage amplify-e2e-core patterns

## Migration Strategy Refinement

### Phase 1: Complete Partial Migrations (1-2 days)

**Target**: amplify-category-api completion

- Migrate ssmClient.ts from v2 to v3
- Remove aws-sdk v2 dependency from package.json
- Add @aws-sdk/client-ssm dependency

### Phase 2: Core Utilities Migration (3-4 days)

**Target**: amplify-util-mock

- Migrate DynamoDB utilities (highest complexity)
- Update test patterns and mocking infrastructure
- Establish v3 patterns for other packages

### Phase 3: Supporting Packages (2-3 days)

**Target**: amplify-dynamodb-simulator, amplify-e2e-tests

- Migrate simulator integration
- Update E2E test utilities
- Leverage amplify-e2e-core patterns

### Phase 4: Final Cleanup (1 day)

- Remove aws-sdk v2 from root package.json resolutions
- Final validation and testing

## Technical Migration Patterns

### DynamoDB Migration (Most Complex)

**Current v2 Pattern**:

```typescript
import { DynamoDB } from 'aws-sdk';
const dynamodb = new DynamoDB({ region: 'us-east-1' });
const result = await dynamodb.describeTable({ TableName: 'test' }).promise();
```

**Target v3 Pattern**:

```typescript
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const result = await dynamodb.send(new DescribeTableCommand({ TableName: 'test' }));
```

### SSM Migration (Simple)

**Current v2 Pattern**:

```typescript
import aws from 'aws-sdk';
const ssm = new aws.SSM({ region });
```

**Target v3 Pattern**:

```typescript
import { SSMClient } from '@aws-sdk/client-ssm';
const ssm = new SSMClient({ region });
```

## Risk Assessment

### Low Risk

- Container templates already migrated
- Lambda functions already migrated
- E2E core already provides v3 patterns

### Medium Risk

- DynamoDB utilities migration (extensive usage)
- Test infrastructure updates
- Simulator integration compatibility

### High Risk

- None identified - good migration foundation exists

## Success Metrics

1. **Zero aws-sdk v2 dependencies** in any package.json
2. **All tests passing** after migration
3. **E2E tests successful** with v3 SDK
4. **No performance regression** > 5%
5. **Container templates functional** (already validated)

## Next Steps

1. **Immediate**: Start with Phase 1 (amplify-category-api completion)
2. **Create branch**: `feature/aws-sdk-v3-migration-phase1`
3. **Target files**:
   - `packages/amplify-category-api/src/provider-utils/awscloudformation/utils/rds-resources/ssmClient.ts`
   - `packages/amplify-category-api/package.json`

This analysis shows the migration is more advanced than initially thought, with most infrastructure already migrated. The remaining work is focused and manageable.
