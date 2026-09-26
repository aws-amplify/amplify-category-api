# Code Navigation & Architecture

How to find code, understand the codebase, and navigate the package dependency graph.

## Discovery Strategy

1. **Search symbols first:** Use `code` tool with `search_symbols` for functions/classes/types
2. **Follow with lookup:** Use `lookup_symbols` to get implementation details
3. **Grep for text:** Only for literal strings, comments, config values
4. **Read this doc** for architectural context when reviewing PRs or explaining behavior

## High-Level Architecture

This is a Lerna monorepo that implements the Amplify Gen 2 Data layer. The system takes a user's GraphQL schema with Amplify directives (like `@model`, `@auth`, `@hasMany`) and transforms it into a fully deployed AWS AppSync API with all necessary infrastructure (DynamoDB tables, resolvers, Lambda functions, IAM roles, etc.) via AWS CDK constructs.

### Data Flow

```
User's GraphQL Schema (with @directives)
        │
        ▼
┌─────────────────────────┐
│  CDK Construct Layer    │  amplify-graphql-api-construct / amplify-data-construct
│  (entry point)          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Transformer Orchestrator│  amplify-graphql-transformer
│  (assembles pipeline)    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Transform Engine       │  amplify-graphql-transformer-core
│  (GraphQLTransform)     │  Walks the schema AST, invokes each
│                         │  transformer plugin per directive
└────────┬────────────────┘
         │  calls each transformer's lifecycle methods:
         │  before → object/field/interface → after
         │  + preProcess, validate, prepare, transformSchema, generateResolvers
         ▼
┌─────────────────────────┐
│  Transformer Plugins    │  amplify-graphql-*-transformer (one per directive)
│  @model, @auth, @index  │  Each reads directives, mutates the TransformerContext:
│  @hasOne, @hasMany, etc │  adds types, resolvers, data sources, IAM policies
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  CDK Resources          │  NestedStacks with AppSync API, DynamoDB tables,
│  (output)               │  Lambda functions, resolvers, IAM roles, etc.
└─────────────────────────┘
```

### Key Concepts

- **TransformerContext** — Shared mutable state passed through the pipeline. Transformers add/modify schema types, resolvers, data sources, and CloudFormation resources on this context.
- **Directive** — A GraphQL schema annotation (e.g., `@model`, `@auth`) that a transformer plugin knows how to process.
- **Data Source Strategy** — Configures how a model's data is stored (DynamoDB, SQL/RDS). Set per-model via `ModelDataSourceStrategy`.
- **VTL / JS Resolvers** — Transformers generate AppSync resolver code (VTL mapping templates or JS runtime resolvers) that gets deployed as part of the API.

## Package Catalog

### Entry Points (CDK Constructs)

| Package (directory)             | npm name                             | Purpose                                                                                                                                                      |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `amplify-graphql-api-construct` | `@aws-amplify/graphql-api-construct` | Main L3 CDK construct (`AmplifyGraphqlApi`). Entry point for deploying a GraphQL API. Assembles all transformers, runs the pipeline, produces CDK resources. |
| `amplify-data-construct`        | `@aws-amplify/data-construct`        | Thin alias over `graphql-api-construct` using "Data" naming for Amplify Gen 2 branding. Re-exports the same construct.                                       |

### Transformer Pipeline

| Package (directory)                      | npm name                                      | Purpose                                                                                                                                                                                                     |
| ---------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `amplify-graphql-transformer`            | `@aws-amplify/graphql-transformer`            | Orchestrator. Assembles the full list of transformer plugins and passes them to the transform engine. This is what the construct calls.                                                                     |
| `amplify-graphql-transformer-core`       | `@aws-amplify/graphql-transformer-core`       | Transform engine. Contains `GraphQLTransform` (walks schema AST, invokes plugins), `TransformerContext`, `TransformerResolver`, `TransformerOutput`, `StackManager`, and all CDK resource generation logic. |
| `amplify-graphql-transformer-interfaces` | `@aws-amplify/graphql-transformer-interfaces` | TypeScript interfaces and types for the transformer plugin contract. Leaf package — no internal deps. Defines `TransformerPluginProvider`, `TransformerContextProvider`, `ModelDataSourceStrategy`, etc.    |

### Directive Transformer Plugins

Each handles one or more GraphQL directives. All share a common dependency pattern: `directives` + `transformer-core` + `transformer-interfaces` + `mapping-template` + `transformer-common`.

| Package (directory)                         | npm name                                         | Directive(s)                                       | What it does                                                                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `amplify-graphql-model-transformer`         | `@aws-amplify/graphql-model-transformer`         | `@model`                                           | Core transformer. Generates CRUD operations, DynamoDB tables (or SQL data sources), queries, mutations, subscriptions, and resolvers. Most other transformers depend on this. |
| `amplify-graphql-auth-transformer`          | `@aws-amplify/graphql-auth-transformer`          | `@auth`                                            | Generates authorization rules (API key, Cognito, IAM, OIDC, Lambda). Injects auth logic into resolvers. Depends on model + relational transformers.                           |
| `amplify-graphql-index-transformer`         | `@aws-amplify/graphql-index-transformer`         | `@index`, `@primaryKey`                            | Creates DynamoDB GSIs and configures primary keys. Depends on model transformer.                                                                                              |
| `amplify-graphql-relational-transformer`    | `@aws-amplify/graphql-relational-transformer`    | `@hasOne`, `@hasMany`, `@belongsTo`, `@manyToMany` | Generates relational connections between models. Depends on model + index transformers.                                                                                       |
| `amplify-graphql-searchable-transformer`    | `@aws-amplify/graphql-searchable-transformer`    | `@searchable`                                      | Adds OpenSearch integration for full-text search. Depends on model transformer.                                                                                               |
| `amplify-graphql-function-transformer`      | `@aws-amplify/graphql-function-transformer`      | `@function`                                        | Connects fields to Lambda function data sources.                                                                                                                              |
| `amplify-graphql-http-transformer`          | `@aws-amplify/graphql-http-transformer`          | `@http`                                            | Connects fields to HTTP endpoint data sources.                                                                                                                                |
| `amplify-graphql-predictions-transformer`   | `@aws-amplify/graphql-predictions-transformer`   | `@predictions`                                     | Integrates with Amazon AI/ML services (Rekognition, Translate, Polly).                                                                                                        |
| `amplify-graphql-default-value-transformer` | `@aws-amplify/graphql-default-value-transformer` | `@default`                                         | Sets default values on model fields during create mutations.                                                                                                                  |
| `amplify-graphql-sql-transformer`           | `@aws-amplify/graphql-sql-transformer`           | `@sql`                                             | Enables custom SQL statements against RDS data sources. Depends on model transformer.                                                                                         |
| `amplify-graphql-validate-transformer`      | `@aws-amplify/graphql-validate-transformer`      | `@validate`                                        | Adds input validation rules to mutation fields.                                                                                                                               |
| `amplify-graphql-conversation-transformer`  | `@aws-amplify/graphql-conversation-transformer`  | `@conversation`                                    | AI conversation routes. Depends on model + relational + index transformers.                                                                                                   |
| `amplify-graphql-generation-transformer`    | `@aws-amplify/graphql-generation-transformer`    | `@generation`                                      | AI content generation queries.                                                                                                                                                |
| `amplify-graphql-name-mapping-transformer`  | `@aws-amplify/graphql-maps-to-transformer`       | `@mapsTo`                                          | Maps model names for schema evolution / renaming. Note: directory name differs from npm name.                                                                                 |

### Foundation Libraries

| Package (directory)                | npm name                                | Purpose                                                                                                                    |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `amplify-graphql-directives`       | `@aws-amplify/graphql-directives`       | Directive SDL definitions (the actual `directive @model on OBJECT` strings). Leaf package — no deps.                       |
| `graphql-mapping-template`         | `graphql-mapping-template`              | AST builder for AppSync VTL resolver mapping templates. Leaf package — no deps.                                            |
| `graphql-transformer-common`       | `graphql-transformer-common`            | Shared utilities: type helpers, resource name generation, GraphQL AST manipulation. Depends on `graphql-mapping-template`. |
| `graphql-transformer-core`         | `graphql-transformer-core`              | Legacy (v1) transform engine. Still used by some e2e tests. Not used in the main Gen 2 pipeline.                           |
| `amplify-graphql-schema-generator` | `@aws-amplify/graphql-schema-generator` | Generates GraphQL schema from existing SQL database introspection.                                                         |

### Test Packages

| Package (directory)                      | npm name                                              | Purpose                                                                                            |
| ---------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `amplify-graphql-transformer-test-utils` | `@aws-amplify/graphql-transformer-test-utils`         | Shared test helpers for transformer unit tests. Used as devDep by nearly all transformer packages. |
| `amplify-graphql-schema-test-library`    | `@aws-amplify/graphql-schema-test-library`            | Library of valid and unsupported schema examples for testing.                                      |
| `amplify-e2e-core`                       | `amplify-category-api-e2e-core`                       | Core e2e test framework: project setup, CLI helpers, AWS resource management.                      |
| `amplify-e2e-tests`                      | `amplify-category-api-e2e-tests`                      | Main e2e test suite. Tests full deployment flows.                                                  |
| `amplify-graphql-api-construct-tests`    | `amplify-graphql-api-construct-tests`                 | CDK construct-specific e2e tests.                                                                  |
| `graphql-transformers-e2e-tests`         | `amplify-category-api-graphql-transformers-e2e-tests` | Legacy transformer e2e tests.                                                                      |

## Dependency Graph (Simplified)

```
amplify-data-construct
  └─► amplify-graphql-api-construct
        └─► amplify-graphql-transformer (orchestrator)
              ├─► amplify-graphql-model-transformer ◄── most transformers depend on this
              ├─► amplify-graphql-auth-transformer
              ├─► amplify-graphql-index-transformer
              ├─► amplify-graphql-relational-transformer
              ├─► amplify-graphql-searchable-transformer
              ├─► amplify-graphql-function-transformer
              ├─► amplify-graphql-http-transformer
              ├─► amplify-graphql-predictions-transformer
              ├─► amplify-graphql-default-value-transformer
              ├─► amplify-graphql-sql-transformer
              ├─► amplify-graphql-validate-transformer
              ├─► amplify-graphql-conversation-transformer
              ├─► amplify-graphql-generation-transformer
              └─► amplify-graphql-maps-to-transformer (dir: name-mapping-transformer)

All transformers depend on:
  ├─► amplify-graphql-transformer-core (engine)
  ├─► amplify-graphql-transformer-interfaces (contracts)
  ├─► amplify-graphql-directives (directive SDL)
  ├─► graphql-transformer-common (utilities)
  └─► graphql-mapping-template (VTL builder)
```

### Notable Cross-Transformer Dependencies

- `auth-transformer` → depends on `model-transformer` + `relational-transformer`
- `relational-transformer` → depends on `model-transformer` + `index-transformer`
- `conversation-transformer` → depends on `model-transformer` + `relational-transformer` + `index-transformer`
- `index-transformer` → depends on `model-transformer`
- `searchable-transformer` → depends on `model-transformer`
- `sql-transformer` → depends on `model-transformer`

## External Amplify Dependencies

These `@aws-amplify` packages are consumed by this repo but maintained in other repositories. Changes to their APIs or behavior can affect this codebase.

### amplify-backend ([github.com/aws-amplify/amplify-backend](https://github.com/aws-amplify/amplify-backend))

The Gen 2 backend orchestration layer. This repo's CDK constructs integrate with it for output storage, plugin contracts, and platform utilities.

| Package                               | Used by                                                                           | Role in this repo                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `@aws-amplify/plugin-types`           | api-construct, data-construct, conversation-transformer, transformer orchestrator | Defines the plugin interface contract that the constructs implement to integrate with the Amplify backend pipeline.                   |
| `@aws-amplify/backend-output-schemas` | api-construct, data-construct                                                     | Schema definitions for backend outputs (API endpoint, API key, auth type). The construct writes outputs conforming to these schemas.  |
| `@aws-amplify/backend-output-storage` | api-construct, data-construct                                                     | Storage strategy for persisting construct outputs (e.g., to CloudFormation stack metadata) so client config generation can read them. |
| `@aws-amplify/platform-core`          | api-construct, data-construct                                                     | Shared platform utilities (attribution metadata, environment helpers).                                                                |
| `@aws-amplify/ai-constructs`          | api-construct, data-construct, conversation-transformer                           | CDK constructs for AI/ML features. Used by `@conversation` and `@generation` transformers to provision Bedrock-backed resources.      |
| `@aws-amplify/auth-construct`         | api-construct-tests (e2e only)                                                    | Auth construct used in e2e tests to set up Cognito for testing auth-dependent APIs.                                                   |

### amplify-cli ([github.com/aws-amplify/amplify-cli](https://github.com/aws-amplify/amplify-cli))

The Gen 1 Amplify CLI. Legacy dependencies — used primarily by e2e tests and the legacy transformer engine.

| Package                                  | Used by                           | Role in this repo                                                                             |
| ---------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| `@aws-amplify/amplify-cli-core`          | graphql-transformer-core (legacy) | Core CLI utilities. Only used by the legacy v1 transform engine, not the main Gen 2 pipeline. |
| `@aws-amplify/amplify-app`               | amplify-e2e-tests                 | CLI helper for bootstrapping Amplify projects in e2e tests.                                   |
| `@aws-amplify/amplify-appsync-simulator` | graphql-transformers-e2e-tests    | Local AppSync simulator for legacy e2e tests.                                                 |
| `amplify-headless-interface`             | amplify-e2e-core                  | Headless CLI interface types for programmatic e2e test setup.                                 |

### amplify-js ([github.com/aws-amplify/amplify-js](https://github.com/aws-amplify/amplify-js))

The Amplify JavaScript client library. Used in e2e tests to make actual GraphQL requests against deployed APIs.

| Package             | Used by                                                        | Role in this repo                                                                                                       |
| ------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `aws-amplify`       | e2e-tests, api-construct-tests, graphql-transformers-e2e-tests | Client SDK used in e2e tests to call deployed AppSync APIs (queries, mutations, subscriptions). Currently pinned to v4. |
| `@aws-amplify/core` | api-construct-tests, graphql-transformers-e2e-tests            | Core client utilities (auth, API configuration) used in e2e tests.                                                      |

## Where to Look for Common Tasks

| Task                                 | Start here                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Adding/modifying a directive         | The corresponding `*-transformer` package's `src/graphql-*-transformer.ts`                                 |
| Changing CRUD resolver logic         | `amplify-graphql-model-transformer/src/resolvers/` (split by `dynamodb/` and `rds/`)                       |
| Modifying auth rule behavior         | `amplify-graphql-auth-transformer/src/`                                                                    |
| Changing how the CDK construct works | `amplify-graphql-api-construct/src/amplify-graphql-api.ts`                                                 |
| Modifying the transform pipeline     | `amplify-graphql-transformer-core/src/transformation/transform.ts` (`GraphQLTransform` class)              |
| Adding a new transformer plugin      | Create package, implement `TransformerPluginProvider` interface, register in `amplify-graphql-transformer` |
| Changing VTL resolver templates      | `graphql-mapping-template/` for the AST builder; individual transformer `src/resolvers/` for usage         |
| Modifying shared types/interfaces    | `amplify-graphql-transformer-interfaces/src/`                                                              |
| Schema introspection from SQL        | `amplify-graphql-schema-generator/`                                                                        |
