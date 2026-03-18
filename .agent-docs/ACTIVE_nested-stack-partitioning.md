# Active Work: Nested Stack Partitioning

**Status:** Design  
**Branch:** (not yet created)  
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
