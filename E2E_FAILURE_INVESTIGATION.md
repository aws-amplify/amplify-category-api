# E2E Test Failure Investigation Report
**Date:** 2026-03-31  
**Scope:** Analysis of 22 failed E2E test batches from recent runs

---

## Executive Summary

### Failure Breakdown
- **59% (13 batches):** me-south-1 region test timeouts
- **18% (4 batches):** Cleanup script failures
- **23% (5 batches):** Other failures (requires further investigation)

### Critical Findings
1. **me-south-1 is a critical bottleneck** - 100% failure rate with consistent 20-22 minute timeouts
2. **Cleanup script lacks robustness** - Fails when accessing disabled opt-in regions
3. **Resource limits likely involved** - Indirect evidence from timeouts and cleanup failures

---

## Failure Analysis

### Category 1: me-south-1 Test Timeouts (59% - 13 batches)

**Affected Tests:**
- Amplify DDB Canary: 6 batches
- Default DDB Canary: 4 batches  
- CreateAPI Canary: 3 batches

**Error Pattern:**
```
FAIL src/__tests__/amplify-ddb-canary.test.ts (1315.19 s)
  Canary using Amplify DynamoDB model datasource strategy
    ✕ Able to deploy simple schema (1282409 ms)
```

**Root Cause:** Tests timeout during CloudFormation stack deployment in me-south-1

**Possible Issues:**
- Regional resource constraints (VPC limits, EIP limits)
- Network latency from CodeBuild to me-south-1
- Service availability issues in me-south-1
- Lower service quotas in newer region

**Frequency:** 100% failure rate - systematic issue, not transient

---

### Category 2: Cleanup Failures (18% - 4 batches)

**Error Pattern 1: InternalServerErrorException**
```
Irrecoverable error in getAmplifyApps {
  "name":"InternalServerErrorException",
  "$fault":"client",
  "message":"Internal server error"
}
```

**Error Pattern 2: Opt-in Region Access Failures**
```
(opt-in region failure) Listing apps for account 182702232950-me-south-1 failed with error with code UnrecognizedClientException. Skipping.
(opt-in region failure) Listing RDS instances for account 182702232950-eu-south-1 failed with error with code InvalidClientTokenId. Skipping.
```

**Root Cause:** Cleanup script iterates through all regions including disabled opt-in regions

**Issues:**
- me-south-1, eu-south-1, ap-east-1 not enabled for all accounts
- Cross-account permissions missing in some regions
- Amplify API returns InternalServerErrorException after multiple failures
- No recovery mechanism in cleanup script

**Code Location:** `packages/amplify-e2e-tests/src/cleanup-e2e-resources.ts`

---

### Category 3: Other Failures (23% - 5 batches)

**Affected Tests:**
- SQL MySQL Canary: 1 batch
- Codegen (Android/iOS/TS): 3 batches
- CreateAPI Canary: 1 batch

**Status:** Requires further investigation

---

## Resource Limit Errors - Status

### NOT Found (but should monitor):
- ✗ VPC limit errors (VpcLimitExceeded, AddressLimitExceeded)
- ✗ CloudFormation DELETE_FAILED stacks
- ✗ S3 bucket deletion failures
- ✗ Throttling errors (TooManyRequestsException)
- ✗ IAM role limit errors

### Likely Present (indirect evidence):
- ⚠ Resource limits causing me-south-1 timeouts
- ⚠ Cleanup failures suggest underlying quota issues

---

## Error Frequency Table

| Error Type | Count | % | Batches |
|---|---|---|---|
| me-south-1 Test Timeout | 13 | 59% | 13 |
| Cleanup InternalServerError | 1 | 5% | 1 |
| Cleanup Opt-in Region Failures | 3+ | 14%+ | 3+ |
| Other/Unknown | 5 | 23% | 5 |
| **TOTAL** | **22** | **100%** | **22** |

---

## Affected Batch IDs

### Amplify DDB Canary (6)
- amplify-category-api-amplify-ddb-cdk-construct-canary-workflow:3a1ea259-cdac-4d11-b77b-01cce5dbfd9b
- amplify-category-api-amplify-ddb-cdk-construct-canary-workflow:79f609e5-d608-40d1-95d7-6b6ee45c92fb
- amplify-category-api-amplify-ddb-cdk-construct-canary-workflow:7d71d289-14ef-4813-bb4b-8ca28ac91f4d
- amplify-category-api-amplify-ddb-cdk-construct-canary-workflow:27fcfa2f-b95f-449a-b897-4800bc653203
- amplify-category-api-amplify-ddb-cdk-construct-canary-workflow:4004dbcd-6fde-464d-b325-4e4a00e7a1ff
- amplify-category-api-amplify-ddb-cdk-construct-canary-workflow:9bc16298-241d-4777-9186-46d191973d67

### Default DDB Canary (4)
- amplify-category-api-default-ddb-cdk-construct-canary-workflow:2e1da5b5-a1e9-462c-94ea-419650740a09
- amplify-category-api-default-ddb-cdk-construct-canary-workflow:735f1b4f-b450-42dd-b75d-070f432b12ef
- amplify-category-api-default-ddb-cdk-construct-canary-workflow:8f4f8e88-7e02-4680-9ca6-22c078bee935
- amplify-category-api-default-ddb-cdk-construct-canary-workflow:a08777f3-c5d5-4bb5-8b66-8405a113af38

### CreateAPI Canary (4)
- amplify-category-api-createapi-canary-workflow:1b4bf85e-c1a0-4b4a-911e-3dc21fc8297f
- amplify-category-api-createapi-canary-workflow:65bf963c-c62b-4757-9873-140769bc6cf0
- amplify-category-api-createapi-canary-workflow:a49a6900-6610-46f9-98a8-6dfb1fd55964
- amplify-category-api-createapi-canary-workflow:01bdc0f7-a582-4816-9a86-0448327bbf73

### Main Canary Workflow (4)
- amplify-category-api-canary-workflow:406ad0f8-7b1b-4901-a959-cd5353c20895
- amplify-category-api-canary-workflow:89192d6e-0093-4a0b-a403-cef30ee4515a
- amplify-category-api-canary-workflow:9a9b6e65-96bb-41c8-9779-d030cf6336c2
- amplify-category-api-canary-workflow:1b076230-6255-4207-90df-d3750ed664c0

### Codegen & Other (4)
- amplify-codegen-android-app-build-canary-workflow:d25a61aa-228f-42ac-a50d-7fd4869c3bd4
- amplify-codegen-ios-app-build-canary-workflow:ab74896a-1f99-4bba-ab41-b55f032c99ce
- amplify-codegen-ts-app-build-canary-workflow:2ab2c742-aa71-41f5-8054-301d97d063b9
- amplify-category-api-sql-mysql-cdk-construct-canary-workflow:45d3830a-ed22-43f2-9f59-3f204110985d

---

## Recommendations

### Immediate Actions (CRITICAL)
1. **Disable me-south-1 tests** until root cause found
   - File: `scripts/e2e-test-regions.json`
   - Or increase test timeout in canary buildspecs

2. **Fix cleanup script** to handle opt-in regions gracefully
   - File: `packages/amplify-e2e-tests/src/cleanup-e2e-resources.ts`
   - Add region availability check before accessing
   - Add retry logic for transient errors

3. **Add monitoring** for resource quotas
   - CloudWatch alarms for VPC/EIP/IAM/Lambda limits

### High Priority Investigation
1. Check AWS Service Quotas dashboard for each account/region
2. Analyze CloudFormation stack creation times in me-south-1
3. Review full test logs from representative failed builds
4. Check AWS service health for me-south-1 region

### Medium Priority
1. Profile test execution time per region
2. Implement resource quota management in test framework
3. Add comprehensive error reporting to cleanup script

---

## Files Requiring Attention

### Cleanup Script (HIGH PRIORITY)
- `packages/amplify-e2e-tests/src/cleanup-e2e-resources.ts`
  - Line 244: `getAmplifyApps()` - Add region availability check
  - Line 915: `cleanupAccount()` - Skip disabled regions
  - Add retry logic for transient errors

### Test Configuration
- `scripts/e2e-test-regions.json` - Consider removing me-south-1
- `codebuild_specs/amplify_ddb_canary.yml` - Increase timeout or disable me-south-1
- `codebuild_specs/default_ddb_canary.yml` - Increase timeout or disable me-south-1
- `codebuild_specs/createapi_canary_workflow.yml` - Increase timeout or disable me-south-1

### Pipeline Configuration
- `codebuild_specs/e2e_workflow.yml` - Main E2E workflow
- `codebuild_specs/canary_workflow.yml` - Canary workflow
- `codebuild_specs/cleanup_e2e_resources.yml` - Cleanup buildspec

---

## Next Steps

1. **Immediate:** Disable me-south-1 tests to unblock other failures
2. **Short-term:** Fix cleanup script to handle opt-in regions
3. **Medium-term:** Investigate me-south-1 performance issues
4. **Long-term:** Implement resource quota monitoring and management

