# Active Work: Nested Stack Partitioning

**Status:** Design
**Branch:** `wirej/nested-stack-partitioning`
**Supersedes:** [PR #3437](https://github.com/aws-amplify/amplify-category-api/pull/3437) (external, will not merge)

## Problem

Customers with large schemas (100+ types) hit CloudFormation's 1MB template size limit. Each nested stack has its own 1MB limit, so distributing resolvers across multiple nested stacks solves this.

## Why PR #3437 Won't Work

PR #3437 adds a `PartitioningNestedStackProvider` that tries to route resources by inspecting the `name` parameter in `provide(scope, name)`. The fatal flaw is a misunderstanding of how `provide()` is called.

### The actual call chain

1. Transformers call `stackManager.getScopeFor(resourceId, defaultStackName)` — e.g., `getScopeFor('GetTodoResolver', 'Todo')`

   - [model-resource-generator.ts:135](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-model-transformer/src/resources/model-resource-generator.ts#L135): `resolver.setScope(context.stackManager.getScopeFor(query.resolverLogicalId, def!.name.value))`
   - [model-resource-generator.ts:169](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-model-transformer/src/resources/model-resource-generator.ts#L169): same for mutations
   - [model-resource-generator.ts:216](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-model-transformer/src/resources/model-resource-generator.ts#L216): same for subscriptions

2. `StackManager.getScopeFor` resolves the stack name (usually the model name like `"Todo"`) and **caches** the result:

   - [stack-manager.ts:38-48](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-transformer-core/src/transformer-context/stack-manager.ts#L38-L48): if the stack exists, return cached; otherwise call `createStack` once

3. `createStack` calls `nestedStackProvider.provide(this.scope, stackName)` **once per unique stack name**, then caches:
   - [stack-manager.ts:24-28](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-transformer-core/src/transformer-context/stack-manager.ts#L24-L28)

### What `provide()` actually receives

The `name` parameter is a **stack name**, not a resource name:

- Model stacks: `"Todo"`, `"Note"`, `"Comment"` (from `def!.name.value`)
- Relational resolvers: `"ConnectionStack"` ([ddb-generator.ts:47](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-relational-transformer/src/resolver/ddb-generator.ts#L47))
- Function resolvers: `"FunctionDirectiveStack"` ([graphql-function-transformer.ts:39](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-function-transformer/src/graphql-function-transformer.ts#L39))
- SQL resolvers: `"CustomSQLStack"` ([graphql-sql-transformer.ts:41](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-sql-transformer/src/graphql-sql-transformer.ts#L41))
- Table manager: `"AmplifyTableManager"` ([amplify-dynamo-model-resource-generator.ts:20](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-model-transformer/src/resources/amplify-dynamodb-table/amplify-dynamo-model-resource-generator.ts#L20))

### Why the PR's categorization fails

The PR's `categorizeResource()` checks for patterns like `'resolver'`, `'table'`, `'datasource'`, `'graphqlapi'` — but it receives model names like `"Todo"`, which match **none** of those patterns. Everything falls through to `ResourceCategory.OTHER` → single `"DataOther"` stack → no partitioning.

The one accidental match: `"FunctionDirectiveStack"` contains `"function"` and would be categorized as `RESOLVERS`, but that stack also contains Lambda data sources, IAM roles, and conditions — not just resolvers.

### Why the PR's tests pass anyway

The unit tests call `provide()` directly with synthetic names like `"QueryGetTodoResolver"` and `"TodoTable"` — names that never occur in real usage. The integration tests create real `AmplifyGraphqlApi` instances but only assert on nested stack counts, which may pass for the wrong reasons.

## Existing Infrastructure: `stackMappings`

There is already a `stackMappings` feature that does exactly the resource-to-stack routing we need. It's the right foundation to build on.

### History and why it was never automated

`stackMappings` has existed since the very beginning of the CDK construct — added by Al Harris in the initial `feat: add graphql api cdk construct` commit (June 2023, `681939d26`). It was carried over from the Gen 1 transformer's `StackMapping` concept, which dates to the transformer redesign in Nov 2020 (`a93c6852f`, by Yuth).

In Gen 1, `stackMappings` was exposed via `transform.conf.json` and documented as a manual workaround: [Place AppSync Resolvers in Custom-named Stacks](https://docs.amplify.aws/gen1/flutter/build-a-backend/graphqlapi/modify-amplify-generated-resources/#place-appsync-resolvers-in-custom-named-stacks). Customers could manually specify which resolvers go to which stacks.

In Gen 2, `stackMappings` is exposed on the CDK construct (`AmplifyGraphqlApiProps.stackMappings`) but was **never exposed through `defineData`** in `amplify-backend`. The `DataProps` type in `amplify-backend/packages/backend-data/src/types.ts` has no `stackMappings` field. This means Gen 2 `defineData` users have no workaround at all — they can't manually split stacks, and there's no automatic splitting.

This is exactly the gap [issue #2550](https://github.com/aws-amplify/amplify-category-api/issues/2550) describes: a customer with 60 models who fixed the problem in Gen 1 using custom stacks and `amplify push --minify`, but says "I couldn't do these in Gen 2."

The feature was likely never automated because:

1. In Gen 1, the manual `StackMapping` in `transform.conf.json` was "good enough" for the few customers who hit the limit
2. The CDK construct inherited it as a manual prop for power users
3. Gen 2's `defineData` abstraction intentionally hides CDK-level knobs — `stackMappings` was one of many props that didn't get surfaced
4. Nobody built the automatic computation layer that would make it work transparently

### How it works today

`stackMappings` is a `Record<string, string>` mapping `{ resolverLogicalId: stackName }`. It's a **manual** override — users specify which resolvers go to which stacks.

**User-facing prop:**

- [types.ts:836-842](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-api-construct/src/types.ts#L836-L842): `readonly stackMappings?: Record<string, string>` on `AmplifyGraphqlApiProps`
- JSDoc warns: "after initial deployment AppSync resolvers cannot be moved between nested stacks, they will need to be removed from the app, then re-added from a new stack"

**Flow through the system:**

1. [amplify-graphql-api.ts:237](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-api-construct/src/amplify-graphql-api.ts#L237): `stackMapping: stackMappings ?? {}` passed to `ExecuteTransformConfig`
2. [graphql-transformer.ts:111-117](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-transformer/src/graphql-transformer.ts#L111-L117): destructured and passed to `GraphQLTransform` constructor
3. [transform.ts:145](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-transformer-core/src/transformation/transform.ts#L145): stored as `this.stackMappingOverrides`
4. [transform.ts:217](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-transformer-core/src/transformation/transform.ts#L217): passed to `TransformerContext`
5. [index.ts:142](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-transformer-core/src/transformer-context/index.ts#L142): `new StackManager(scope, nestedStackProvider, parameterProvider, stackMapping)`
6. [stack-manager.ts:21](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-transformer-core/src/transformer-context/stack-manager.ts#L21): stored as `this.resourceToStackMap`
7. [stack-manager.ts:39](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-transformer-core/src/transformer-context/stack-manager.ts#L39): **checked first** in `getScopeFor` — if a resource has a mapping, it overrides the default stack

**Resolver logical ID format** (the keys for `stackMappings`):

- [ResolverResourceIDs.ts:4-22](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/graphql-transformer-common/src/ResolverResourceIDs.ts#L4-L22): `Create${typeName}Resolver`, `Update${typeName}Resolver`, `Delete${typeName}Resolver`, `Get${typeName}Resolver`, `List${typeName}Resolver`
- Example: for a `Todo` model → `GetTodoResolver`, `ListTodoResolver`, `CreateTodoResolver`, `UpdateTodoResolver`, `DeleteTodoResolver`

**Existing e2e test:**

- [index-with-stack-mappings.test.ts](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-e2e-tests/src/__tests__/graphql-v2/index-with-stack-mappings.test.ts): tests moving index resolvers to a `MappedResolvers` stack, deploys, and validates queries still work

### Why this is the right foundation

The `stackMappings` mechanism already:

- Routes individual resolvers to named stacks via `resourceToStackMap`
- Is checked **first** in `getScopeFor` (overrides the default model-name stack)
- Creates stacks lazily on first use
- Has an existing e2e test proving resolvers work from non-default stacks
- Doesn't touch tables or data sources (they stay in their default stacks)

**Our job is to compute the `stackMappings` automatically** instead of requiring users to specify them manually. The partitioning logic generates a `Record<string, string>` and passes it as `stackMappings`. No changes needed to `StackManager`, `NestedStackProvider`, or any transformer.

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

**Compute `stackMappings` automatically.** Given the schema, enumerate all resolver logical IDs and assign them to overflow stacks using deterministic hashing. Pass the result as `stackMappings` into the existing pipeline. Tables and data sources stay in their default model stacks untouched.

This means:

- Zero changes to `StackManager` or `NestedStackProvider`
- Zero changes to any transformer
- The only new code is the mapping computation + the opt-in prop on `AmplifyGraphqlApiProps`
- We build on a mechanism that already has e2e test coverage

### Two repos, two layers

1. **`amplify-category-api` (this repo)**: Add `enableAutoPartitioning` prop to `AmplifyGraphqlApiProps`. When enabled, compute `stackMappings` automatically before passing to the transform pipeline. This is the CDK construct layer — usable by anyone using the construct directly.

2. **`amplify-backend` (separate repo)**: Surface the feature through `defineData` in `DataProps` so Gen 2 users get it. This is where the actual customer pain is — `defineData` users have zero workaround today. The `amplify-backend` change is a thin pass-through: add a prop to `DataProps`, wire it to `AmplifyGraphqlApiProps.enableAutoPartitioning` in the factory.

The `amplify-backend` PR depends on the `amplify-category-api` PR being published first (or using a linked local build for testing).

## E2E Test Plan: Data Loss & Migration Safety

### Existing Coverage

The `stackMappings` mechanism already has an e2e test: [index-with-stack-mappings.test.ts](https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-e2e-tests/src/__tests__/graphql-v2/index-with-stack-mappings.test.ts). It deploys a schema, moves index resolvers to a custom `MappedResolvers` stack via `setStackMapping`, and validates queries still work. This proves the underlying plumbing works — resolvers function correctly from non-default stacks.

What we still need to test: the automatic computation layer, migration safety (toggling on/off), and churn behavior. But we don't need to re-prove that resolvers work from custom stacks — that's already covered.

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
- [x] Found existing `stackMappings` infrastructure to build on

## What's Next

- [ ] Design the automatic `stackMappings` computation (deterministic hash of resolver logical ID → overflow stack name)
- [ ] Implement in `amplify-graphql-api-construct` (compute mapping, pass as `stackMappings`)
- [ ] Unit tests against real transformer flow
- [ ] Integration tests with actual large schemas
- [ ] E2E tests per the plan above
- [ ] Migration safety testing (enable → deploy → disable → deploy)
