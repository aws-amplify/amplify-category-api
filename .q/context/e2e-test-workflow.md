# E2E Test Workflow Documentation

## Overview

This document outlines the complete workflow for running and managing E2E tests for AWS SDK migration branches.

## Prerequisites

### Authentication Setup

1. **ada CLI** must be installed and configured
2. **AWS CLI** must be installed
3. Access to the E2E test accounts (configured in `scripts/.env`)

### Required Profiles

- **AmplifyAPIE2EProd**: Production E2E test account (see E2E_ACCOUNT_PROD in ./scripts/.env)
- **AmplifyAPIE2EBeta**: Beta E2E test account (see E2E_ACCOUNT_BETA in ./scripts/.env)

## Workflow Steps

### 1. Push Branch (Manual Step)

```bash
# User pushes the branch to GitHub
git push origin wirej/aws-sdk-v3-amplify-category-api
```

### 2. Start E2E Tests

```bash
# Run production E2E test suite
yarn cloud-e2e

# Alternative: Run beta E2E test suite (for testing)
yarn cloud-e2e-beta
```

This will:

- Authenticate with the E2E account using ada
- Start a CodeBuild batch job
- Return a batch ID and console URL

### 3. Monitor Test Progress

#### Quick Status Check

```bash
# Check current status
./scripts/quick-build-status.sh <buildBatchId>
```

#### Automated Monitoring with Retries

```bash
# Monitor and auto-retry failed builds (up to 10 times)
yarn ts-node scripts/e2e-test-manager.ts monitor <buildBatchId>

# Custom retry limit
yarn ts-node scripts/e2e-test-manager.ts monitor <buildBatchId> 5
```

#### Manual Status Check

```bash
# Get detailed status
yarn ts-node scripts/e2e-test-manager.ts status <buildBatchId>
```

### 4. Handle Failed Tests

#### Manual Retry

```bash
# Retry failed builds
yarn ts-node scripts/e2e-test-manager.ts retry <buildBatchId>
```

#### Debug Failed Tests

```bash
# Start debug session for failed tests
yarn cloud-e2e-debug <buildBatchId>
```

### 5. View Test Artifacts

```bash
# Download and serve test artifacts locally
yarn view-test-artifacts <buildBatchId>
```

## Available Scripts

### Core E2E Commands

- `yarn cloud-e2e` - Start production E2E tests
- `yarn cloud-e2e-beta` - Start beta E2E tests
- `yarn cloud-e2e-debug <batchId>` - Debug failed tests

### Management Scripts

- `./scripts/quick-build-status.sh <batchId>` - Quick status check
- `yarn ts-node scripts/e2e-test-manager.ts status <batchId>` - Detailed status
- `yarn ts-node scripts/e2e-test-manager.ts retry <batchId>` - Retry failed builds
- `yarn ts-node scripts/e2e-test-manager.ts monitor <batchId> [maxRetries]` - Auto-monitor with retries

### Artifact Management

- `yarn view-test-artifacts <batchId>` - View test artifacts
- `yarn authenticate-e2e-profile` - Authenticate for manual AWS CLI calls

## Retry Logic

### Automatic Retries

The monitoring script will automatically retry failed builds up to 10 times (configurable) with these conditions:

1. **Retryable Failures**: Infrastructure issues, timeouts, rate limits
2. **Non-Retryable**: Clear code bugs or test failures
3. **Polling Interval**: 10 minutes between status checks
4. **Max Retries**: 10 attempts (configurable)

### Manual Retry Decision

For manual retries, consider:

- **Infrastructure failures**: Network timeouts, service unavailable → Retry
- **Test failures**: Assertion errors, compilation errors → Don't retry (fix code)
- **Flaky tests**: Intermittent failures → Retry with caution

## Authentication Requirements

### Initial Setup (One-time)

```bash
# Configure ada profiles (if not already done)
ada cred update --profile=AmplifyAPIE2EProd --account=$(grep E2E_ACCOUNT_PROD ./scripts/.env | cut -d'=' -f2) --role=CodebuildDeveloper --provider=isengard
```

### Per-Session Authentication

The scripts handle authentication automatically, but you may need to:

1. **Refresh ada credentials** if they expire
2. **Re-authenticate** if you see permission errors

### Manual Authentication

```bash
# Authenticate for manual AWS CLI calls
yarn authenticate-e2e-profile
```

## Monitoring Best Practices

### For Q (AI Assistant)

1. **Start monitoring immediately** after triggering E2E tests
2. **Use automated monitoring** for hands-off operation
3. **Check every 10 minutes** during active development
4. **Retry up to 10 times** for infrastructure failures
5. **Stop retrying** if failures are clearly code-related

### For Developers

1. **Monitor console URL** for real-time updates
2. **Check artifacts** for failed tests to understand failures
3. **Use debug mode** for investigating specific test failures
4. **Clean up resources** after testing (if needed)

## Example Complete Workflow

```bash
# 1. Push branch (manual)
git push origin wirej/aws-sdk-v3-amplify-category-api

# 2. Start E2E tests
yarn cloud-e2e
# Output: Batch ID and console URL

# 3. Monitor automatically
yarn ts-node scripts/e2e-test-manager.ts monitor amplify-category-api-e2e-workflow:12345678-1234-1234-1234-123456789012

# 4. If needed, view artifacts for failures
yarn view-test-artifacts amplify-category-api-e2e-workflow:12345678-1234-1234-1234-123456789012
```

## Troubleshooting

### Authentication Issues

```bash
# Refresh ada credentials
ada cred update --profile=AmplifyAPIE2EProd --account=$(grep E2E_ACCOUNT_PROD ./scripts/.env | cut -d'=' -f2) --role=CodebuildDeveloper --provider=isengard --once

# Verify AWS CLI access
aws sts get-caller-identity --profile AmplifyAPIE2EProd
```

### Build Not Found

- Verify the batch ID format
- Check if you're using the correct account/profile
- Ensure the build hasn't been deleted (builds expire after some time)

### Permission Errors

- Verify ada credentials are current
- Check if the role has necessary permissions
- Try re-authenticating with the E2E profile

## Integration with Q TODO System

When managing E2E tests, update the Q_TODO.md current sprint with:

- Batch ID being monitored
- Current status (in progress, retrying, completed)
- Any issues encountered
- Next steps based on results
