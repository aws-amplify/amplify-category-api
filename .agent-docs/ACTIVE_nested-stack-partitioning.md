# Active Work: Nested Stack Partitioning

**Status:** Design  
**Branch:** `wirej/nested-stack-partitioning`  
**Supersedes:** [PR #3437](https://github.com/aws-amplify/amplify-category-api/pull/3437) (external, will not merge)

## Problem

Customers with large schemas (100+ types) hit CloudFormation's 1MB template size limit. Each nested stack has its own 1MB limit, so distributing resolvers across multiple nested stacks solves this.

## Why PR #3437 Won't Work

PR #3437 adds a `PartitioningNestedStackProvider` that tries to route resources by inspecting the `name` parameter in `provide(scope, name)`. The fatal flaw:

- `StackManager` calls `provide()` once per **stack name** (e.g., `"Todo"`, `"ConnectionStack"`), not once per resource
- `StackManager` caches the returned stack — all resources for that stack name reuse the cached result
- The PR's `categorizeResource()` checks for patterns like `'resolver'`, `'table'`, `'datasource'` — but it receives model names like `"Todo"`, which match none of those patterns
- Everything falls through to `OTHER` category → single stack → no partitioning

The unit tests pass because they call `provide()` directly with synthetic names like `"QueryGetTodoResolver"`, which never happen in real usage.

## Correct Integration Point

The partitioning logic must live at the `StackManager` level (`packages/amplify-graphql-transformer-core/src/transformer-context/stack-manager.ts`), not the `NestedStackProvider` level. `StackManager` is where stack assignment decisions are made — it knows about resource IDs and default stack names.

Key files:

- `packages/amplify-graphql-transformer-core/src/transformer-context/stack-manager.ts` — stack assignment logic
- `packages/amplify-graphql-transformer-interfaces/src/nested-stack-provider.ts` — `NestedStackProvider` type (thin, just creates stacks)
- `packages/amplify-graphql-model-transformer/src/resources/model-resource-generator.ts` — how resolvers get assigned to stacks (via `getScopeFor(resolverLogicalId, modelName)`)

## How Stacks Are Assigned Today

1. Each `@model` type (e.g., `Todo`) gets one nested stack containing its table, data source, IAM roles, AND resolvers
2. `@hasMany`/`@belongsTo` resolvers go to `ConnectionStack`
3. `@function` resolvers + data sources go to `FunctionDirectiveStack`
4. `@sql` resolvers go to `CustomSQLStack`
5. Stack creation is lazy — first `getScopeFor` call for a stack name triggers `provide()`

## Design Constraints

1. **No data loss**: DynamoDB tables must never move between stacks (CloudFormation would delete+recreate)
2. **No flip-flop**: Resolver-to-stack assignment must be deterministic across deployments (stable hashing, not order-dependent bin-packing)
3. **Opt-in initially**: Default behavior must be unchanged
4. **Migration safety**: Toggling the feature on/off must not cause resource destruction

## Design Direction

Split model stacks: keep table + data source in the model's stack, but allow resolvers to overflow into numbered resolver stacks. Use deterministic assignment (e.g., hash of resolver logical ID mod N) rather than sequential bin-packing.

## E2E Test Plan: Data Loss & Migration Safety

### Testing Strategy: Low Thresholds for Fast Feedback

Expose a `maxResolversPerStack` parameter (and/or CDK context key) that controls when overflow stacks are created. In e2e tests, set this to an absurdly low value (e.g., 2-3 resolvers per stack) so that even a 3-model schema forces partitioning. This lets us exercise all redistribution logic with single-digit model counts and ~2-minute deployments instead of needing 100+ models.

Example: a schema with `Todo`, `Note`, `Comment` (3 models × ~7 resolvers each = ~21 resolvers). With `maxResolversPerStack: 3`, that forces 7 resolver overflow stacks — enough to exercise every code path without a massive schema.

### Critical Test Cases

**Case 1: Enable partitioning on existing deployment (the migration case)**

1. Deploy schema with 3+ models, partitioning OFF (baseline — single stack per model)
2. Write test data to each DynamoDB table
3. Re-deploy same schema with partitioning ON (low threshold to force redistribution)
4. Assert: zero tables replaced (CloudFormation changeset should show no table deletes)
5. Assert: test data still present and readable in every table
6. Assert: all CRUD operations still work (create, read, update, delete via AppSync)

**Case 2: Disable partitioning on partitioned deployment (rollback)**

1. Deploy schema with partitioning ON (low threshold)
2. Write test data
3. Re-deploy same schema with partitioning OFF
4. Assert: zero tables replaced, data intact, CRUD works

**Case 3: Enable → deploy → add model → deploy (schema evolution)**

1. Deploy with partitioning ON, 3 models
2. Write test data
3. Add a 4th model, re-deploy
4. Assert: original 3 tables untouched, data intact, new table created, all CRUD works

**Case 4: Enable → deploy → remove model → deploy (schema shrink)**

1. Deploy with partitioning ON, 4 models
2. Write test data to all 4
3. Remove 1 model, re-deploy
4. Assert: removed table is deleted (expected), remaining 3 tables untouched with data intact

**Case 5: Stable assignment across no-op deploys (churn detection)**

1. Deploy with partitioning ON
2. Re-deploy with zero schema changes
3. Assert: CloudFormation changeset is empty (no updates to any stack)
4. Repeat 2-3 times to confirm determinism

**Case 6: Stable assignment across schema additions (anti-churn)**

1. Deploy with partitioning ON, 3 models
2. Add a 4th model, re-deploy
3. Assert: resolvers for original 3 models did NOT move between stacks (check CloudFormation events — no resolver deletes/creates in existing stacks)

**Case 7: Relationships across partition boundaries**

1. Deploy with partitioning ON (low threshold), schema with `@hasMany`/`@belongsTo` across models that land in different stacks
2. Write parent + child records
3. Assert: relational queries work (nested resolvers can reach tables in other stacks)

**Case 8: @function and @sql directives with partitioning**

1. Deploy schema with `@function` directive + partitioning ON
2. Assert: Lambda data source and resolver both work correctly
3. Same for `@sql` if applicable

### How to Validate "Zero Tables Replaced"

Two complementary approaches:

- **CloudFormation changeset inspection**: Before executing the update, create a changeset and inspect it programmatically. Any `AWS::DynamoDB::Table` with action `Remove` or `Replace` is a test failure.
- **Table ARN stability**: Record table ARNs before and after deployment. ARNs include the physical table name — if a table is deleted and recreated, the ARN changes. Compare before/after.

### Parameterization for Speed

The implementation should accept these as tunable parameters (not just for testing — they're useful for users too):

- `maxResolversPerStack` — primary lever for forcing overflow in tests
- Possibly `stackSizeThreshold` — but resolver count is more predictable for testing

CDK context keys (e.g., `amplify-data-max-resolvers-per-stack`) would let e2e tests pass config without code changes.

## What's Done

- [x] Analyzed PR #3437 and identified architectural issues
- [x] Mapped the real call flow through StackManager → NestedStackProvider
- [x] Identified all stack assignment patterns across transformers

## What's Next

- [ ] Design the StackManager-level partitioning approach
- [ ] Prototype in `stack-manager.ts`
- [ ] Unit tests against real transformer flow (not synthetic `provide()` calls)
- [ ] Integration tests with actual large schemas
- [ ] E2E tests with deployment
- [ ] Migration safety testing (enable → deploy → disable → deploy)
