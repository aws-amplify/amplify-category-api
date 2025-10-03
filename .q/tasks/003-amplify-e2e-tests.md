# TASK-003: Amplify E2E Tests AWS SDK v3 Migration

## Status: COMPLETED ✅

## Requirements

Migrate `packages/amplify-e2e-tests` from AWS SDK v2 to v3:

1. ✅ Update package.json dependencies
2. ✅ Migrate service imports and usage patterns
3. ✅ Update test files and utilities
4. ✅ Ensure all tests continue to pass

## Services Migrated

- ✅ S3 (multiple files)
- ✅ IAM (matchers)
- ✅ STS (cleanup utilities)
- ✅ Organizations (cleanup utilities)
- ✅ CodeBuild (utilities)
- ✅ CognitoIdentityServiceProvider (multiple files)
- ✅ CloudFormation (cleanup utilities)
- ✅ Amplify (cleanup utilities)

## Files Updated

- ✅ src/import-helpers/utilities.ts
- ✅ src/import-helpers/types.ts
- ✅ src/cleanup-e2e-resources.ts
- ✅ src/schema-api-directives/authHelper.ts
- ✅ src/cleanup-stale-test-buckets.ts
- ✅ src/aws-matchers/s3matcher.ts
- ✅ src/aws-matchers/iamMatcher.ts

## Progress

- ✅ Analyze current AWS SDK usage patterns
- ✅ Update package.json dependencies
- ✅ Migrate service imports
- ✅ Update client instantiation patterns
- ✅ Update method calls (remove .promise())
- ✅ Run tests to verify migration
- ✅ Commit changes

## Notes

- Some files already used v3 (CognitoIdentityProviderClient in Lambda functions)
- Created compatibility layer for deleteS3Bucket function (e2e-core still uses v2)
- Updated OAuth flow types and other Cognito-related types
- All TypeScript compilation successful
- Migration patterns established for future packages

## Dependencies Added

- @aws-sdk/client-cloudformation
- @aws-sdk/client-codebuild
- @aws-sdk/client-cognito-identity-provider
- @aws-sdk/client-iam
- @aws-sdk/client-organizations
- @aws-sdk/client-s3
- @aws-sdk/client-sts
- @aws-sdk/client-amplify
- @aws-sdk/credential-providers

## Compatibility Notes

- deleteS3Bucket function from amplify-category-api-e2e-core still expects v2 S3 client
- Created compatibility wrapper using aws-sdk v2 for this specific function
- This will need to be updated when e2e-core is migrated to v3
