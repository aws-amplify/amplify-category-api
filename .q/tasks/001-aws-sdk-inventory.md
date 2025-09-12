# Task 001: AWS SDK Usage Inventory

## Objective

Create a comprehensive inventory of all AWS SDK v2 and v3 usage across the repository to inform migration strategy.

## Scope

- All packages in the repository
- All file types (.ts, .js, .json)
- Direct and indirect dependencies
- Usage patterns and service types

## Deliverables

1. Complete usage inventory (CSV/JSON format)
2. Service usage breakdown (DynamoDB, EC2, IAM, etc.)
3. Package migration priority matrix
4. Shared utility identification

## Approach

### 1. Dependency Analysis

```bash
# Find all package.json files with AWS SDK dependencies
find packages -name "package.json" -exec grep -l "aws-sdk\|@aws-sdk" {} \;

# Extract dependency versions
grep -r "aws-sdk\|@aws-sdk" packages/*/package.json
```

### 2. Code Usage Analysis

```bash
# Find all imports/requires of AWS SDK
find packages -name "*.ts" -o -name "*.js" | xargs grep -l "from.*aws-sdk\|require.*aws-sdk\|from.*@aws-sdk\|require.*@aws-sdk"

# Analyze service usage patterns
grep -r "new.*Client\|new.*\(.*aws-sdk" packages/
```

### 3. Service Mapping

- DynamoDB usage (most common)
- EC2 usage (VPC utilities)
- IAM usage (permissions)
- Lambda usage (function management)
- RDS usage (database resources)
- Other services

### 4. Pattern Analysis

- Client instantiation patterns
- Method call patterns (.promise() vs send())
- Error handling patterns
- Testing/mocking patterns

## Expected Findings

- amplify-util-mock: Heavy DynamoDB v2 usage
- amplify-category-api: Mixed v2/v3 usage
- amplify-e2e-core: Already v3
- Container templates: v2 usage
- Lambda functions: v2 usage

## Output Format

### Package Inventory

```json
{
  "packages": [
    {
      "name": "amplify-util-mock",
      "path": "packages/amplify-util-mock",
      "dependencies": {
        "aws-sdk": "^2.1113.0"
      },
      "devDependencies": {
        "@aws-sdk/client-dynamodb": null
      },
      "migration_status": "v2_only",
      "services_used": ["dynamodb"],
      "file_count": 15,
      "priority": "high"
    }
  ]
}
```

### Service Usage Matrix

```json
{
  "services": {
    "dynamodb": {
      "packages": ["amplify-util-mock", "amplify-category-api"],
      "v2_usage": 45,
      "v3_usage": 5,
      "migration_complexity": "high"
    },
    "ec2": {
      "packages": ["amplify-category-api", "amplify-e2e-core"],
      "v2_usage": 0,
      "v3_usage": 8,
      "migration_complexity": "low"
    }
  }
}
```

## Success Criteria

- [ ] All packages analyzed
- [ ] All AWS SDK usage catalogued
- [ ] Migration priority established
- [ ] Shared utilities identified
- [ ] Service complexity assessed

## Estimated Time

4-6 hours

## Dependencies

None - this is the foundation task

## Next Task

002-shared-utilities-migration (based on findings from this task)
