# E2E Testing

Complete guide for running, monitoring, and debugging e2e tests.

## Key Concept

E2E tests run against pushed code in AWS CodeBuild, not local changes. Always commit and push before triggering.

## When to Run E2E Tests

- User explicitly requests e2e tests
- User approves e2e testing as part of a task
- Implied when user says "fix and test ..." or "add feature ... and test"

## Cloud E2E Workflow

```sh
# 1. Commit and push all changes first
git push

# 2. Trigger e2e suite
yarn cloud-e2e

# 3. Monitor (auto-retries failed builds, polls every 5 min)
yarn e2e-monitor {batchId}
```

Batch ID format: `amplify-category-api-e2e-workflow:{UUID}` — always use the full ID.

### Other Commands

```sh
yarn e2e-status {batchId}    # Check status once
yarn e2e-retry {batchId}     # Retry failed builds
yarn e2e-list [limit]        # List recent batches
yarn e2e-failed {batchId}    # Show failed builds
yarn e2e-logs {buildId}      # View build logs
```

### Monitor Behavior

The monitor auto-retries failed builds up to 10 times by default. It skips retrying `build_linux`, `build_windows`, `test`, and `lint` because failures in those are typically code-related and require fixes, not retries.

If errors persist after multiple retries or multiply as fixes are applied, ask the user for guidance.

## Running Individual E2E Tests Locally

```sh
cd packages/amplify-e2e-tests
yarn e2e src/__tests__/api_1.test.ts
```

Local e2e tests create real AWS resources. You need valid credentials.

### Authentication

The repo scripts use `ada` (Amazon's credential management tool), called automatically. Setup:

1. Ensure `ada` and `mwinit` are installed
2. Create `scripts/.env`:
   ```bash
   E2E_ACCOUNT_PROD=<account-id>
   E2E_ACCOUNT_BETA=<account-id>
   ```
3. If you see auth errors, run `mwinit`

For personal AWS profiles, export credentials before running:

```sh
export AWS_PROFILE=your-profile-name
```

## Debugging E2E Failures

### 1. Identify the Failing Build

```sh
yarn e2e-failed <batch-id>
```

### 2. Get Build Logs

```sh
yarn e2e-logs <build-id>
```

### 3. Simulate Locally

Run the equivalent local command to reproduce. See [Development Commands](./DEVELOPMENT.md) for build step equivalents.

### 4. Check for Pre-existing Issues

```sh
git stash
git checkout main
yarn <failing-command>
git checkout <your-branch>
git stash pop
```

## Common Failure Patterns

| Pattern                  | Symptoms                                           | Action                                            |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------- |
| Transient infrastructure | Timeouts, credential expiration, quota errors      | Retry the build                                   |
| Code-related             | Test failures, build errors, coverage threshold    | Fix the code, don't retry                         |
| Dependency-related       | Module not found, version conflicts, breaking APIs | Check for major version changes, consider pinning |

## Build Job Types

- `build_linux` / `build_windows` — Platform builds (not auto-retried)
- `test` — Unit tests (not auto-retried)
- `lint` — Linting (not auto-retried)
- `verify_dependency_licenses_extract` — License verification
- `verify_api_extract` — API surface verification
- `verify_yarn_lock` — yarn.lock consistency
- `publish_to_local_registry` — Verdaccio publish
- `graphql_e2e_tests_*` — GraphQL e2e test suites (171 jobs)

## Resource Cleanup

E2e tests create real AWS resources. Run periodically:

```sh
yarn cleanup-stale-resources
```

## Troubleshooting

- **"Command failed with exit code 1"** — Generic error. Read the full output for the actual message.
- **"Cannot read properties of undefined"** — Usually a dependency version mismatch or breaking API change.
- **"Coverage threshold not met"** — Check if pre-existing by testing on the base branch.
- **"License change detected"** — Expected after dependency updates. Run `yarn extract-dependency-licenses` and commit.
