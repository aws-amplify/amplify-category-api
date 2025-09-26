# Task: Migrate amplify-dynamodb-simulator to AWS SDK v3

## Analysis

### Current AWS SDK v2 Usage

- **Location**: `packages/amplify-dynamodb-simulator/`
- **Main file**: `index.js` (line 175: `const { DynamoDB } = require('aws-sdk');`)
- **Dependencies**: `package.json` has `"aws-sdk": "^2.1113.0"`
- **Usage pattern**: Simple DynamoDB client creation in `getClient()` function

### Migration Plan

1. Update package.json dependency from `aws-sdk` to `@aws-sdk/client-dynamodb`
2. Update import in index.js from `aws-sdk` to `@aws-sdk/client-dynamodb`
3. Update DynamoDB client instantiation to use v3 pattern
4. Run tests to verify functionality
5. Commit changes

### Complexity Assessment

- **Low complexity** - Only one file needs changes
- **Single usage point** - Only the `getClient()` function uses AWS SDK
- **No mocking** - Tests use real DynamoDB simulator, not SDK mocks
- **Pattern established** - Can follow v3 patterns from Phase 1 work

### Files to Modify

- `packages/amplify-dynamodb-simulator/package.json`
- `packages/amplify-dynamodb-simulator/index.js`

### Test Strategy

- Run existing jest tests (`yarn test` in package directory)
- Tests use actual DynamoDB simulator, so should work unchanged
- Verify client creation and basic operations still work
