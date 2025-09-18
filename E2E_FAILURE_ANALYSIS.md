# E2E Test Failure Analysis

## Current Status (2025-01-18 09:47)

- **Total Builds**: 82
- **Succeeded**: 75 (91.5% success rate)
- **Failed**: 6
- **In Progress**: 1

## ✅ Fixed Issues

- **mock_e2e_tests**: FIXED - Our SDK v3 DynamoDB client fix resolved this

## ❌ Current Failures to Investigate

### 1. verify_yarn_lock: FAILED

**Type**: Likely code-related issue
**Potential Cause**: Our package.json changes may have caused yarn.lock inconsistencies

### 2. containers_api_secrets_schema_function_1_api_3_api_canary_me_south_1: FAILED

**Type**: Unknown - need to check logs
**Potential Cause**: Could be timeout, resource issue, or code issue

### 3. api_override_ddb_table_name_generate_ts_data_schema_resolvers_sync_query_datastore: FAILED

**Type**: Unknown - need to check logs  
**Potential Cause**: Could be related to our DynamoDB changes

### 4. RelationalWithAuthV2NonRedacted_RelationalWithAuthV2Redacted_SearchableModelTransformerV2_SearchableWithAuthTests: FAILED

**Type**: Unknown - need to check logs
**Potential Cause**: Likely unrelated to our changes

### 5. FunctionTransformerTestsV2: FAILED

**Type**: Unknown - need to check logs
**Potential Cause**: Likely unrelated to our changes

### 6. cleanup_e2e_resources: FAILED

**Type**: Likely infrastructure/timeout issue
**Potential Cause**: Resource cleanup timeouts (safe to retry)

## Next Steps

1. Check AWS console logs for specific error details
2. Categorize failures as:
   - **Code Issues**: Need fixes before retry
   - **Infrastructure Issues**: Safe to retry
   - **Timeout Issues**: Safe to retry
