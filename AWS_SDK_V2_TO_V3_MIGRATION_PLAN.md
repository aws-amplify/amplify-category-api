# AWS SDK v2 to v3 Migration Plan

## Overview

This document outlines the plan to migrate from AWS SDK v2 to v3 across all packages in the amplify-category-api repository. The migration will be done incrementally, with one PR per package to ensure manageable changes and proper testing.

## Migration Strategy

- **Approach**: One PR per package to maintain focused, reviewable changes
- **Priority**: Start with core packages, then move to dependent packages
- **Testing**: Ensure all existing tests pass after migration
- **Compatibility**: Maintain backward compatibility where possible
- **Branching**: Use format `wirej/gen1-migrate-aws-sdk-PACKAGE-NAME` where "gen1" refers to the library version

## Packages Requiring Migration

### High Priority (Core Packages)

1. **amplify-e2e-core** - Already partially migrated (has some v3 clients)
2. **amplify-category-api** - Main API category package
3. **amplify-util-mock** - Core mocking utilities
4. **amplify-dynamodb-simulator** - DynamoDB simulation

### Medium Priority (Transformer Packages)

5. **amplify-graphql-model-transformer** - GraphQL model transformations
6. **graphql-relational-schema-transformer** - Relational schema transformations

### Lower Priority (Lambda Functions)

7. **amplify-graphql-model-transformer/rds-lambda** - RDS Lambda function
8. **amplify-graphql-model-transformer/rds-patching-lambda** - RDS patching Lambda
9. **amplify-graphql-model-transformer/publish-notification-lambda** - Notification Lambda

### Test Packages

10. **amplify-e2e-tests** - End-to-end tests
11. **graphql-transformers-e2e-tests** - Transformer E2E tests

### Template/Container Packages

12. **amplify-category-api/resources/awscloudformation/container-templates/dockerfile-rest-express**
13. **amplify-category-api/resources/awscloudformation/container-templates/graphql-express**
14. **amplify-category-api/resources/awscloudformation/container-templates/dockercompose-rest-express/express**

## Migration Steps Per Package

### 1. Dependency Updates

- Remove `aws-sdk` v2 dependency
- Add specific `@aws-sdk/*` v3 client packages
- Update TypeScript types

### 2. Code Changes

- Replace `import { ServiceName } from 'aws-sdk'` with `import { ServiceNameClient } from '@aws-sdk/client-service-name'`
- Update client instantiation from `new AWS.ServiceName()` to `new ServiceNameClient()`
- Replace `.promise()` calls with native async/await
- Update error handling for v3 error structure
- Update configuration patterns

### 3. Common Migration Patterns

#### DynamoDB

```typescript
// v2
import { DynamoDB } from 'aws-sdk';
const client = new DynamoDB();
const result = await client.listTables().promise();

// v3
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
const client = new DynamoDBClient({});
const result = await client.send(new ListTablesCommand({}));
```

#### Lambda

```typescript
// v2
import { Lambda } from 'aws-sdk';
const lambda = new Lambda();
const result = await lambda.invoke(params).promise();

// v3
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
const lambda = new LambdaClient({});
const result = await lambda.send(new InvokeCommand(params));
```

## Package-Specific Migration Details

### amplify-e2e-core

- **Status**: Partially migrated (already has v3 clients)
- **Remaining**: Remove any v2 dependencies, ensure consistency
- **Services**: EC2, KMS, RDS, RDS Data, Secrets Manager, SSM, STS

### amplify-category-api

- **Dependencies**: aws-sdk v2 + some v3 clients (EC2, IAM, Lambda)
- **Services**: Multiple AWS services used throughout
- **Complexity**: High - main package with extensive AWS integration

### amplify-util-mock

- **Dependencies**: aws-sdk v2 in devDependencies
- **Services**: Primarily DynamoDB for mocking
- **Complexity**: Medium - focused on DynamoDB operations

### amplify-dynamodb-simulator

- **Services**: DynamoDB
- **Complexity**: Medium - DynamoDB-specific operations

### Lambda Functions

- **Services**: Various (Lambda, SNS, Secrets Manager, SSM)
- **Complexity**: Low-Medium - isolated Lambda functions
- **Note**: These are deployed Lambda functions, so bundle size matters

## Testing Strategy

### Per Package

1. Run existing unit tests
2. Run integration tests if available
3. Manual testing of key functionality
4. E2E tests for critical paths

### Cross-Package

1. Run full test suite after each migration
2. Integration testing between packages
3. End-to-end workflow testing

## Risk Mitigation

### Breaking Changes

- Maintain wrapper functions for complex migrations
- Use feature flags for gradual rollout
- Comprehensive testing at each step

### Performance

- Monitor bundle sizes, especially for Lambda functions
- Benchmark critical operations
- Tree-shaking verification

### Compatibility

- Ensure peer dependency compatibility
- Version alignment across packages
- Backward compatibility where needed

## Implementation Timeline

### Phase 1: Core Infrastructure (Weeks 1-2)

- ✅ **amplify-e2e-core** (cleanup) - COMPLETED
  - Migrated DynamoDB, S3, Lambda, and IAM operations to AWS SDK v3
  - Used hybrid approach: migrated available services, kept temporary v2 usage for unavailable packages
  - Services migrated: DynamoDB, S3, Lambda, IAM
  - Services pending: Cognito, AppSync, CloudFormation, AmplifyBackend (using temporary require() calls)
- amplify-util-mock
- amplify-dynamodb-simulator

### Phase 2: Main Packages (Weeks 3-4)

- amplify-category-api
- amplify-graphql-model-transformer

### Phase 3: Supporting Packages (Weeks 5-6)

- Lambda functions
- graphql-relational-schema-transformer
- Test packages

### Phase 4: Templates and Cleanup (Week 7)

- Container templates
- Final integration testing
- Documentation updates

## Success Criteria

### Per Package

- [ ] All existing tests pass
- [ ] No aws-sdk v2 dependencies remain
- [ ] Bundle size within acceptable limits
- [ ] Performance benchmarks met

### Overall

- [ ] Full test suite passes
- [ ] E2E workflows functional
- [ ] No regression in functionality
- [ ] Documentation updated

## Notes for Implementation

### Branching Convention

- Format: `wirej/gen1-migrate-aws-sdk-PACKAGE-NAME`
- Example: `wirej/gen1-migrate-aws-sdk-e2e-core`
- "gen1" refers to the version of the library being migrated
- "wirej/" is the developer prefix

### Commit Message Format

- Use conventional commits: `feat(scope): description`
- Scope must match the exact package name from the allowed list
- Example: `feat(amplify-category-api-e2e-core): migrate to AWS SDK v3`

### Hybrid Migration Approach

For packages where not all AWS SDK v3 clients are available:

1. Migrate services that have v3 clients available
2. Keep temporary v2 usage with `require('aws-sdk')` for unavailable services
3. Add both v3 clients and temporary v2 dependency to package.json
4. Document which services are fully migrated vs. temporary
5. Plan to complete migration when missing v3 clients become available

### Code Review Focus

- Proper error handling migration
- Configuration object changes
- Async/await pattern consistency
- Type safety maintenance

### Common Gotchas

- Error object structure changes in v3
- Configuration parameter differences
- Pagination pattern changes
- Credential provider updates

### Tools and Resources

- AWS SDK v3 Migration Guide
- Automated migration tools where available
- Bundle analyzer for size monitoring
- Performance profiling tools

## Next Steps

1. Start with amplify-e2e-core cleanup
2. Create detailed migration checklist for each package
3. Set up monitoring for bundle sizes and performance
4. Begin implementation following the priority order
