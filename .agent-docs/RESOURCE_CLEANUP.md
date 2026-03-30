# Resource Cleanup Guide

## Overview

E2E tests create AWS resources (CloudFormation stacks, IAM roles/policies, S3 buckets, RDS instances, AppSync APIs) across multiple accounts and regions. When tests fail or time out, these resources can become orphans that accumulate and eventually hit service quotas.

## Quick Reference

```sh
# Discover orphaned resources across ALL accounts
yarn cloud-find-garbage

# Discover orphaned resources in a SPECIFIC account
yarn cloud-find-garbage 772747216485

# Clean up with dry-run (shows what would be deleted)
yarn cloud-cleanup 772747216485 --dry-run

# Clean up for real
yarn cloud-cleanup 772747216485

# Clean up all accounts
yarn cloud-cleanup
```

## How It Works

### Two Tools, Shared Discovery

- `yarn cloud-find-garbage` — Discovery only. Reports stale test resources per account. Safe to run anytime.
- `yarn cloud-cleanup` — Runs the same discovery, then deletes. Supports `--dry-run`.

Both use `scripts/e2e-resource-manager.ts` which shares all discovery logic, so what you see in discovery is exactly what cleanup will target.

### What Gets Discovered/Cleaned

| Resource Type         | Pattern                                             | Staleness       |
| --------------------- | --------------------------------------------------- | --------------- |
| IAM Managed Policies  | `amplify-*`, `auth-exhaustive*`, `MultiAuth*`, etc. | > 6 hours old   |
| IAM Roles             | Same patterns as existing cleanup                   | > 6 hours old   |
| CloudFormation Stacks | Test name patterns                                  | > 6 hours old   |
| S3 Buckets            | Contains "test"                                     | > 6 hours old   |
| AppSync APIs          | Test name patterns                                  | Name match only |

### CI Integration

The e2e workflow has two cleanup steps:

1. **`cleanup_stale_resources`** — Runs concurrently with `build_linux` (no dependencies). Cleans up orphans from _previous_ runs before new tests start.
2. **`cleanup_e2e_resources`** — Runs after tests complete. Cleans up resources from the _current_ batch.

### Existing Cleanup (packages/amplify-e2e-tests)

The `yarn clean-e2e-resources` command in `amplify-e2e-tests` is the original cleanup script used by CI. It was updated to also clean:

- **IAM managed policies** (NEW — this was the `PoliciesPerAccount: 3000` blocker)
- **IAM roles with pagination** (FIXED — previously only found first 100 roles)

## Extending for New Resource Types

When you hit a new quota issue:

### 1. Add to `scripts/e2e-resource-manager.ts`

Add a new `discoverXxx()` function following the existing pattern:

```typescript
async function discoverXxx(account: AccountInfo, region: string): Promise<{ resources: ResourceSummary[]; errors: string[] }> {
  // 1. Create client
  // 2. List resources with pagination (use paginateAll helper)
  // 3. Filter by test name pattern + staleness
  // 4. Return as ResourceSummary[]
}
```

Wire it into `discoverAccountResources()` and add deletion logic to `cleanupResources()`.

### 2. Add to `packages/amplify-e2e-tests/src/cleanup-e2e-resources.ts`

Follow the same pattern as the IAM policy additions:

1. Add imports for the new SDK client
2. Add a type (e.g., `type XxxInfo = { ... }`)
3. Add a regex pattern and staleness filter
4. Add `getOrphanXxx()` discovery function
5. Add `deleteXxx()` deletion function
6. Wire into `cleanupAccount()` and `deleteResources()`

### 3. Test

```sh
# Verify discovery finds the resources
yarn cloud-find-garbage <accountId>

# Dry-run cleanup
yarn cloud-cleanup <accountId> --dry-run

# Real cleanup
yarn cloud-cleanup <accountId>
```

## Common Quota Issues

| Quota              | Limit | Service | How to Check                                                     |
| ------------------ | ----- | ------- | ---------------------------------------------------------------- |
| PoliciesPerAccount | 3000  | IAM     | `aws iam list-policies --scope Local --query 'length(Policies)'` |
| RolesPerAccount    | 1000  | IAM     | `aws iam list-roles --query 'length(Roles)'`                     |
| GraphQL APIs       | 25    | AppSync | `aws appsync list-graphql-apis --query 'length(graphqlApis)'`    |
| Functions          | 1000  | Lambda  | `aws lambda list-functions --query 'length(Functions)'`          |

## Troubleshooting

- **ExpiredTokenException**: Re-run `yarn authenticate-e2e-profile` to refresh credentials.
- **Throttling**: The scripts have built-in retry with exponential backoff. If persistent, reduce concurrency.
- **Account not found**: Ensure the account ID is in the organization. Run `yarn cloud-find-garbage` without an account ID to see all available accounts.
