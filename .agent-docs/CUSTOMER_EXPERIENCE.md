# Customer Experience & Known Issues

Context for understanding what customers build, how they interact with this codebase's output, and how to quickly triage questions and issues. This doc covers Gen 2 only.

## What a Customer's App Looks Like

Customers are frontend developers (React, Next.js, Angular, Vue, React Native, Flutter, Swift, Android) who define their backend data layer in TypeScript. They never write GraphQL SDL directly — they use the `@aws-amplify/backend` TypeScript DSL.

### Typical Project Structure

```
my-app/
├── amplify/
│   └── data/
│       └── resource.ts        ← Data model + auth rules defined here
├── src/
│   ├── main.tsx               ← Amplify.configure(outputs)
│   └── components/            ← Client code using generateClient<Schema>()
├── amplify_outputs.json       ← Auto-generated connection config (API URL, keys, etc.)
└── package.json               ← depends on "aws-amplify"
```

### Backend Definition (what triggers our transform pipeline)

```typescript
// amplify/data/resource.ts
import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      isDone: a.boolean(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});
```

This TypeScript definition gets compiled into GraphQL SDL with directives (`@model`, `@auth`, etc.) which is what our transformer pipeline processes.

### Frontend Usage (what consumes our API output)

```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

const client = generateClient<Schema>();

// CRUD — fully typed
const { data } = await client.models.Todo.create({ content: 'Buy milk', isDone: false });
const { data: todos } = await client.models.Todo.list();
await client.models.Todo.update({ id: todo.id, isDone: true });
await client.models.Todo.delete({ id: todo.id });

// Real-time subscriptions
client.models.Todo.observeQuery().subscribe({
  next: ({ items }) => setTodos([...items]),
});
```

### What Customers Commonly Configure

Beyond basic CRUD, roughly in order of frequency:

1. **Authorization rules** — `allow.owner()`, `allow.group('Admin')`, `allow.publicApiKey()`, `allow.authenticated()`, combinations thereof
2. **Relationships** — `a.hasMany()`, `a.hasOne()`, `a.belongsTo()`, `a.manyToMany()`
3. **Secondary indexes** — `a.index()` for custom query patterns
4. **Custom identifiers** — composite primary keys
5. **Custom queries/mutations** — `a.query()`, `a.mutation()` backed by Lambda functions
6. **SQL data sources** — connecting to existing MySQL/PostgreSQL databases
7. **Real-time subscriptions** — `observeQuery()`, custom subscription filters
8. **AI features** — `@conversation` and `@generation` for Bedrock integration
9. **@searchable** — OpenSearch integration for full-text search
10. **Field-level validation** — `@validate` directive
11. **External HTTP endpoints** — `@http` directive

### Development Workflow

1. `npm create amplify@latest` — scaffold project
2. Edit `amplify/data/resource.ts` — define models
3. `npx ampx sandbox` — deploy to personal cloud sandbox (hot-reloads on file changes)
4. `npm run dev` — run frontend locally against sandbox
5. Push to Git → Amplify Hosting deploys branch-based environments

## DX Feature → Codebase Mapping

When a customer question or issue comes in, use this to find the relevant code:

| Customer-facing feature                        | Directive(s)                                       | Package to investigate                                               |
| ---------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Model CRUD (create, list, get, update, delete) | `@model`                                           | `amplify-graphql-model-transformer`                                  |
| Authorization / access control                 | `@auth`                                            | `amplify-graphql-auth-transformer`                                   |
| Relationships (hasMany, hasOne, belongsTo)     | `@hasOne`, `@hasMany`, `@belongsTo`, `@manyToMany` | `amplify-graphql-relational-transformer`                             |
| Secondary indexes / custom queries             | `@index`, `@primaryKey`                            | `amplify-graphql-index-transformer`                                  |
| Default field values                           | `@default`                                         | `amplify-graphql-default-value-transformer`                          |
| Full-text search                               | `@searchable`                                      | `amplify-graphql-searchable-transformer`                             |
| Lambda function resolvers                      | `@function`                                        | `amplify-graphql-function-transformer`                               |
| HTTP endpoint resolvers                        | `@http`                                            | `amplify-graphql-http-transformer`                                   |
| SQL database connections                       | `@sql`                                             | `amplify-graphql-sql-transformer`                                    |
| AI conversations                               | `@conversation`                                    | `amplify-graphql-conversation-transformer`                           |
| AI content generation                          | `@generation`                                      | `amplify-graphql-generation-transformer`                             |
| Input validation                               | `@validate`                                        | `amplify-graphql-validate-transformer`                               |
| Schema renaming / evolution                    | `@mapsTo`                                          | `amplify-graphql-name-mapping-transformer`                           |
| AI/ML predictions                              | `@predictions`                                     | `amplify-graphql-predictions-transformer`                            |
| DynamoDB table config / streams                | —                                                  | `amplify-graphql-model-transformer` (resources/)                     |
| CloudFormation stack splitting                 | —                                                  | `amplify-graphql-transformer-core` (StackManager)                    |
| CDK construct behavior                         | —                                                  | `amplify-graphql-api-construct`                                      |
| Resolver template generation                   | —                                                  | `graphql-mapping-template` + individual transformer `src/resolvers/` |

## Known Problem Areas (Gen 2)

These are the recurring themes in customer-reported issues. When triaging, check whether the issue falls into one of these buckets — it likely does.

### CloudFormation Resource Limits

Large schemas (20+ models with complex auth) can exceed CloudFormation's 1MB template size or 500-resource-per-stack limit. Each model with auth generates many AppSync `FunctionConfiguration` and `Resolver` resources; schemas with 60+ models and relationships can easily hit 500+ resources in a single stack.

**Docs:** [Modify Amplify-generated AWS resources](https://docs.amplify.aws/react/build-a-backend/data/override-resources/) (general CDK overrides), [Troubleshoot circular dependency issues](https://docs.amplify.aws/react/build-a-backend/troubleshooting/circular-dependency/) (related stack-splitting context). Note: the `stackMappings` prop on the CDK construct is not documented in the Amplify docs — the only reference is the [construct API docs on Construct Hub](https://constructs.dev/packages/@aws-amplify/graphql-api-construct) and the Gen 1 equivalent in [Place AppSync Resolvers in Custom-named Stacks](https://docs.amplify.aws/gen1/javascript/build-a-backend/graphqlapi/modify-amplify-generated-resources/#place-appsync-resolvers-in-custom-named-stacks) (Gen 1 only, but explains the concept). In code, see `AmplifyGraphqlApiProps.stackMappings` in `packages/amplify-graphql-api-construct/src/types.ts`.

**Where in code:** `StackManager` in `transformer-core` controls stack splitting. The construct's `stackMappings` prop lets users distribute resolvers across custom-named stacks.

**Workarounds:** In Gen 1, customers could use `stackMappings` to manually distribute resolvers and `--minify` to reduce template size. In Gen 2, the `stackMappings` prop exists on the `AmplifyGraphqlApi` CDK construct (`AmplifyGraphqlApiProps.stackMappings`), but it is **not exposed through `defineData`** — the `amplify-backend` `DataFactory` does not pass it through, and `DataProps` does not include it. This means customers using the `defineData` schema builder have no way to use stack mappings. The only way to access `stackMappings` in Gen 2 is to bypass `defineData` entirely and instantiate the `AmplifyGraphqlApi` construct directly in `backend.ts` with raw GraphQL SDL, giving up the TypeScript schema builder DX. For `defineData` users, the practical mitigations are reducing model count or simplifying auth rules.

**Status:** Partially mitigated by nested stacks. Fundamentally constrained by CloudFormation limits. Multiple related issues suggest this is a persistent scaling ceiling, not something with a simple fix.

**Exemplary issues:** [#2550](https://github.com/aws-amplify/amplify-category-api/issues/2550) (Gen 2 report with reproduction steps and workaround discussion), [#2153](https://github.com/aws-amplify/amplify-category-api/issues/2153) (template size limit, tagged `pending-release`)

### Auth Rule Combinations

Combining owner-based and group-based auth rules — especially for multi-tenant patterns — is the most commonly reported friction point. The core issue: auth rules combine with OR logic, but multi-tenant apps need AND logic (e.g., "user must belong to this tenant AND have this role"). Field-level auth can unexpectedly null out fields in mutation responses. Custom group claims have edge cases.

**Docs:** [Customize your auth rules](https://docs.amplify.aws/react/build-a-backend/data/customize-authz/) — covers all strategies. Particularly relevant sub-pages: [Per-user/owner access](https://docs.amplify.aws/react/build-a-backend/data/customize-authz/per-user-per-owner-data-access/), [User group-based access](https://docs.amplify.aws/react/build-a-backend/data/customize-authz/user-group-based-data-access/), [Custom identity and group claims](https://docs.amplify.aws/react/build-a-backend/data/customize-authz/configure-custom-identity-and-group-claim/), [Custom Lambda authorization](https://docs.amplify.aws/react/build-a-backend/data/customize-authz/custom-data-access-patterns/)

**Where in code:** `amplify-graphql-auth-transformer` — the resolver injection logic that generates auth checks in VTL/JS resolvers.

**Workarounds:** Customers use custom `ownerField` + `identityField` with a pre-token-generation Lambda to inject tenant claims. This works for simple cases but breaks down when combined with group-based permissions. Some customers implement auth logic in custom Lambda resolvers instead.

**Status:** Long-standing design limitation. The original issue is from 2018 and remains the most upvoted feature request. The OR-vs-AND logic is baked into how the auth transformer generates resolver code. Addressing this would require significant changes to the auth resolver generation strategy.

**Exemplary issues:** [#449](https://github.com/aws-amplify/amplify-category-api/issues/449) (original multi-tenant owner/groups request — describes the OR-vs-AND problem and the pre-token-generation workaround)

### Relational Modeling Edge Cases

Composite keys with relationships, filtering on sort keys, and owner auth on related models produce unexpected resolver behavior. Cascade delete is a frequently requested feature that doesn't exist — customers must manually delete related records before deleting a parent.

**Docs:** [Modeling relationships](https://docs.amplify.aws/react/build-a-backend/data/data-modeling/relationships/) — includes sections on handling orphaned foreign keys on parent deletion (the official manual-delete pattern)

**Where in code:** `amplify-graphql-relational-transformer` and `amplify-graphql-index-transformer` — resolver generation for connection fields and GSI queries.

**Workarounds for cascade delete:** Implement a Lambda function triggered by DynamoDB Streams that handles cascading deletes. Or use a custom mutation resolver that deletes children before the parent. The docs show the manual client-side pattern of fetching children and deleting them before the parent. There's no built-in support.

**Status:** Cascade delete has been requested since 2020 with no built-in solution. The complexity is non-trivial — it requires transactional multi-table operations and handling of circular references. Individual resolver bugs (sort key filtering, enum sort keys) are more tractable and get fixed incrementally.

**Exemplary issues:** [#273](https://github.com/aws-amplify/amplify-category-api/issues/273) (original cascade delete request — describes the manual deletion pain)

### Schema Migration / Destructive Changes

Changing primary keys or removing relationship fields can fail during deployment because DynamoDB tables can't be modified in-place for certain key schema changes. The deployment rolls back with cryptic errors about resource state.

**Docs:** [Customize data model identifiers](https://docs.amplify.aws/react/build-a-backend/data/data-modeling/identifiers/)

**Where in code:** `amplify-graphql-model-transformer/src/resources/amplify-dynamodb-table/amplify-table-manager-lambda/` — the custom resource handler that manages table lifecycle.

**Workarounds:** Remove the model from the schema entirely, deploy, then re-add it with the new key schema and deploy again. This drops and recreates the table (data loss). For production, customers need to create a new model, migrate data, then remove the old one.

**Status:** This is partly a DynamoDB constraint (key schema is immutable) and partly an Amplify deployment orchestration issue. The iterative deployment system doesn't always detect or handle these cases gracefully.

**Exemplary issues:** [#1797](https://github.com/aws-amplify/amplify-category-api/issues/1797) (primary key change failure — describes the remove-and-re-add workaround)

### DynamoDB Stream Configuration

Updating `streamViewType` on an existing table via CDK overrides can close the existing stream and create a new one. The Lambda trigger's event source mapping still points to the old stream ARN, effectively breaking the trigger silently.

**Docs:** [DynamoDB Streams](https://docs.amplify.aws/react/build-a-backend/functions/examples/dynamo-db-stream/) (setup guide), [Modify Amplify-generated AWS resources](https://docs.amplify.aws/react/build-a-backend/data/override-resources/) (CDK overrides)

**Where in code:** `amplify-graphql-model-transformer/src/resources/amplify-dynamodb-table/` — the DynamoDB table construct and custom resource handler.

**Workarounds:** Set the desired `streamViewType` before the first deployment. If already deployed, manually update the Lambda event source mapping to point to the new stream ARN via the AWS console or CLI.

**Status:** Confirmed Gen 2 bug. The root cause is that CloudFormation doesn't update the event source mapping when the stream ARN changes. A fix would need to detect stream ARN changes and update dependent resources.

**Exemplary issues:** [#3386](https://github.com/aws-amplify/amplify-category-api/issues/3386) (detailed reproduction steps with screenshots showing the ARN mismatch)

## Triaging Issues

### Finding Existing Issues

Search the [GitHub issues](https://github.com/aws-amplify/amplify-category-api/issues) with these filters:

- Gen 2 issues: `is:issue is:open label:"Gen 2"`
- By directive: `is:issue is:open label:@auth` (or `@hasMany`, `@searchable`, `@primaryKey`, etc.)
- Most community demand: `is:issue is:open sort:reactions-+1-desc`
- Recent bugs: `is:issue is:open label:bug sort:updated-desc`

### Gen 1 vs Gen 2

Many open issues (especially older ones) are tagged `graphql-transformer-v1` or `graphql-transformer-v2` — these are Gen 1 concerns. Gen 2 issues are tagged `Gen 2`. If an issue doesn't have a Gen 2 label but describes behavior that also exists in Gen 2, it may still be relevant — the underlying transformer code is shared.

### Determining Issue Status

There's no single label that tells you "this will be done" or "this won't." Use these signals together:

- **`pending-release`** — A fix is merged and awaiting release. This is the clearest signal.
- **Priority labels (`p1`–`p4`)** — Indicate severity or importance, not a commitment to deliver. A `p1` means "this is critical" but doesn't guarantee a timeline. A `p4` means "acknowledged, low urgency."
- **Issue comments** — The most reliable signal. Read maintainer comments for context on feasibility, blockers, or design decisions. Some issues have explicit "we're not planning to address this" or "this is on our roadmap" statements.
- **Related/duplicate issues** — Many related issues on the same topic signal community pressure, but also suggest the problem may not be straightforward to solve.
- **Linked PRs or branches** — Check the "Development" section of an issue. A linked PR means active work.
- **Staleness** — An issue open for years with no maintainer comments and no priority label is likely not being actively considered, regardless of reaction count.
- **`feature-request` with high reactions but no priority** — Community-desired but not committed to. Don't tell a customer "this is planned" based on reactions alone.
