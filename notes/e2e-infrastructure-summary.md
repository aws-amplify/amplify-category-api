# E2E Test Infrastructure Summary

## 1. Test Structure

### Framework
- **Test Framework**: Jest (via `yarn e2e`)
- **Parallel Execution**: 5 workers (`--maxWorkers=5`)
- **Package Location**: `packages/amplify-e2e-tests`

### How Tests Deploy
1. **Setup** (`_setupE2ETestsLinux`):
   - Load cached build artifacts from S3
   - Install CLI from local Verdaccio registry
   - Load AWS test account credentials
   - Set Node.js version (24.12.0)

2. **Execution** (`_runE2ETestsLinux`):
   - Run tests via `yarn run e2e --maxWorkers=5 $TEST_SUITE`
   - `$TEST_SUITE` = pipe-separated list of test files (e.g., `src/__tests__/api_1.test.ts|src/__tests__/api_2.test.ts`)
   - Each test creates real AWS resources using deployed CLI

3. **Test Regions**: Tests run across multiple regions (ap-northeast-2, eu-west-1, etc.)

### How Tests Clean Up
- **Automatic**: Tests call cleanup methods in teardown/afterAll hooks
- **Manual/Scheduled**: `yarn cleanup-stale-resources` removes orphaned resources
- **Cleanup Script**: `packages/amplify-e2e-tests/src/cleanup-e2e-resources.ts`
- **Stale Threshold**: 6 hours (resources older than this are considered orphaned)
- **Resources Tracked**: Amplify apps, CloudFormation stacks, S3 buckets, IAM roles, RDS instances

## 2. Downloading/Viewing CodeBuild Logs

### Command
```sh
yarn e2e-logs <buildId>
```

### What It Does (from `scripts/e2e-test-manager.ts`)
1. Fetches build details from CodeBuild API (`BatchGetBuildsCommand`)
2. Extracts CloudWatch Logs location (log group + log stream)
3. Paginated retrieval from CloudWatch Logs API (`GetLogEventsCommand`)
   - Fetches 10,000 events per page (AWS limit)
   - Continues until all events retrieved (max 100 pages for safety)
   - Falls back to AWS CLI if SDK fails
4. Prints complete log output to console

### Other Log Commands
```sh
yarn e2e-status <batchId>     # View batch status
yarn e2e-failed <batchId>     # List failed builds with log commands
yarn e2e-list [limit]         # List recent batches
```

## 3. Common Failure Patterns

| Pattern | Symptoms | Action |
|---------|----------|--------|
| **Transient Infrastructure** | Timeouts, credential expiration, quota errors, AWS API throttling | Retry the build (auto-retried by monitor) |
| **Code-Related** | Test assertion failures, build errors, coverage threshold not met | Fix the code, **DON'T** retry |
| **Dependency-Related** | Module not found, version conflicts, breaking API changes | Check dependency updates, consider version pinning |
| **Resource Quota** | "Limit exceeded" errors for stacks, roles, etc. | Run cleanup script, may need manual resource deletion |

### Non-Retried Builds
The monitor **skips** these job types (failures are code-related):
- `build_linux`
- `build_windows`
- `test` (unit tests)
- `lint`

### Failure Rate Threshold
Monitor stops retrying if failure rate > 50% (indicates systemic issue, not transient failures).

## 4. Key Files

| File | Purpose |
|------|---------|
| `codebuild_specs/e2e_workflow.yml` | Defines all e2e test jobs (171 total) |
| `codebuild_specs/run_e2e_tests.yml` | Individual test job spec |
| `scripts/e2e-test-manager.ts` | Status/logs/retry management |
| `shared-scripts.sh` | Setup/execution functions |
| `packages/amplify-e2e-tests/src/cleanup-e2e-resources.ts` | Resource cleanup |

## 5. Quick Reference

### Trigger Tests
```sh
git push  # MUST push first - CodeBuild runs against pushed code
yarn cloud-e2e  # Returns batch ID
```

### Monitor Tests
```sh
yarn e2e-monitor <batchId>  # Auto-retries, polls every 5 min
```

### Debug Failures
```sh
yarn e2e-failed <batchId>   # List failed builds
yarn e2e-logs <buildId>     # Get full logs
```

### Local Test Run
```sh
cd packages/amplify-e2e-tests
yarn e2e src/__tests__/api_1.test.ts  # Single test file
```
