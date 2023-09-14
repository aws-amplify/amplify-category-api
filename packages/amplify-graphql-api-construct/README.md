# Amplify Graphql API Construct

[![View on Construct Hub](https://constructs.dev/badge?package=%40aws-amplify%2Fgraphql-construct-alpha)](https://constructs.dev/packages/@aws-amplify/graphql-construct-alpha)

This package vends an L3 CDK Construct wrapping the behavior of the Amplify GraphQL Transformer. This enables quick development and interation of AppSync APIs which support the Amplify GraphQL Directives. For more information on schema modeling in GraphQL, please refer to the [amplify developer docs](https://docs.amplify.aws/cli/graphql/overview/).

The primary way to use this construct is to invoke it with a provided schema (either as an inline graphql string, or as one or more `appsync.SchemaFile`) objects, and with authorization config provided. There are 5 supported methods for authorization of an AppSync API, all of which are supported by this construct. For more information on authorization rule definitions in Amplify, refer to the [authorization docs](https://docs.amplify.aws/cli/graphql/authorization-rules/). Note: currently at least one authorization rule is required, and if multiple are specified, a `defaultAuthMode` must be specified on the api as well. Specified authorization modes must be a superset of those configured in the graphql schema.

## Examples

### Simple Todo List With Cognito Userpool-based Owner Authorization

In this example, we create a single model, which will use `user pool` auth in order to allow logged in users to create and manage their own `todos` privately.

We create a cdk App and Stack, though you may be deploying this to a custom stack, this is purely illustrative for a concise demo.

We then wire this through to import a user pool which was already deployed (creating and deploying is out of scope for this example).

```ts
import { App, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi, AmplifyGraphqlSchema } from '@aws-amplify/graphql-construct-alpha';

const app = new App();
const stack = new Stack(app, 'TodoStack');

new AmplifyGraphqlApi(stack, 'TodoApp', {
  schema: AmplifyGraphqlSchema.fromString(/* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: owner }]) {
      description: String!
      completed: Boolean
    }
  `),
  authorizationConfig: {
    userPoolConfig: {
      userPool: UserPool.fromUserPoolId(stack, 'ImportedUserPool', '<YOUR_USER_POOL_ID>'),
    },
  },
});
```

### Multiple related models, with public read access, and admin read/write access

In this example, we create a two related models, which will use which logged in users in the 'Author' and 'Admin' user groups will have
full access to, and customers requesting with api key will only have read permissions on.

```ts
import { App, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi, AmplifyGraphqlSchema } from '@aws-amplify/graphql-construct-alpha';

const app = new App();
const stack = new Stack(app, 'BlogStack');

new AmplifyGraphqlApi(stack, 'BlogApp', {
  schema: AmplifyGraphqlSchema.fromString(/* GraphQL */ `
    type Blog @model @auth(rules: [{ allow: public, operations: [read] }, { allow: groups, groups: ["Author", "Admin"] }]) {
      title: String!
      description: String
      posts: [Post] @hasMany
    }

    type Post @model @auth(rules: [{ allow: public, operations: [read] }, { allow: groups, groups: ["Author", "Admin"] }]) {
      title: String!
      content: [String]
      blog: Blog @belongsTo
    }
  `),
  authorizationConfig: {
    defaultAuthMode: 'API_KEY',
    apiKeyConfig: {
      description: 'Api Key for public access',
      expires: cdk.Duration.days(7),
    },
    userPoolConfig: {
      userPool: UserPool.fromUserPoolId(stack, 'ImportedUserPool', '<YOUR_USER_POOL_ID>'),
    },
  },
});
```

# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### AmplifyGraphqlApi <a name="AmplifyGraphqlApi" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi"></a>

L3 Construct which invokes the Amplify Transformer Pattern over an input Graphql Schema.

This can be used to quickly define appsync apis which support full CRUD+List and Subscriptions, relationships,
auth, search over data, the ability to inject custom business logic and query/mutation operations, and connect to ML services.

For more information, refer to the docs links below:
Data Modeling - https://docs.amplify.aws/cli/graphql/data-modeling/
Authorization - https://docs.amplify.aws/cli/graphql/authorization-rules/
Custom Business Logic - https://docs.amplify.aws/cli/graphql/custom-business-logic/
Search - https://docs.amplify.aws/cli/graphql/search-and-result-aggregations/
ML Services - https://docs.amplify.aws/cli/graphql/connect-to-machine-learning-services/

For a full reference of the supported custom graphql directives - https://docs.amplify.aws/cli/graphql/directives-reference/

The output of this construct is a mapping of L1 resources generated by the transformer, which generally follow the access pattern

```typescript
  const api = new AmplifyGraphQlApi(this, 'api', { <params> });
  api.resources.api.xrayEnabled = true;
  Object.values(api.resources.tables).forEach(table => table.pointInTimeRecoverySpecification = { pointInTimeRecoveryEnabled: false });
```
`resources.<ResourceType>.<ResourceName>` - you can then perform any CDK action on these resulting resoureces.

#### Initializers <a name="Initializers" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer"></a>

```typescript
import { AmplifyGraphqlApi } from '@aws-amplify/graphql-construct-alpha'

new AmplifyGraphqlApi(scope: Construct, id: string, props: AmplifyGraphqlApiProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.props">props</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps">AmplifyGraphqlApiProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.props"></a>

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps">AmplifyGraphqlApiProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.isConstruct"></a>

```typescript
import { AmplifyGraphqlApi } from '@aws-amplify/graphql-construct-alpha'

AmplifyGraphqlApi.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.generatedFunctionSlots">generatedFunctionSlots</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]</code> | Resolvers generated by the transform process, persisted on the side in order to facilitate pulling a manifest for the purposes of inspecting and producing overrides. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.resources">resources</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources">AmplifyGraphqlApiResources</a></code> | Generated resources. |

---

##### `node`<sup>Required</sup> <a name="node" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `generatedFunctionSlots`<sup>Required</sup> <a name="generatedFunctionSlots" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.generatedFunctionSlots"></a>

```typescript
public readonly generatedFunctionSlots: MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot[];
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> | <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> | <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]

Resolvers generated by the transform process, persisted on the side in order to facilitate pulling a manifest for the purposes of inspecting and producing overrides.

---

##### `resources`<sup>Required</sup> <a name="resources" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.resources"></a>

```typescript
public readonly resources: AmplifyGraphqlApiResources;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources">AmplifyGraphqlApiResources</a>

Generated resources.

---


## Structs <a name="Structs" id="Structs"></a>

### AmplifyApiSchemaPreprocessorOutput <a name="AmplifyApiSchemaPreprocessorOutput" id="@aws-amplify/graphql-construct-alpha.AmplifyApiSchemaPreprocessorOutput"></a>

Custom type representing a processed schema output.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.AmplifyApiSchemaPreprocessorOutput.Initializer"></a>

```typescript
import { AmplifyApiSchemaPreprocessorOutput } from '@aws-amplify/graphql-construct-alpha'

const amplifyApiSchemaPreprocessorOutput: AmplifyApiSchemaPreprocessorOutput = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyApiSchemaPreprocessorOutput.property.processedSchema">processedSchema</a></code> | <code>string</code> | Schema generated as an output of the preprocessing step. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyApiSchemaPreprocessorOutput.property.processedFunctionSlots">processedFunctionSlots</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]</code> | Custom functions extracted during preprocessing. |

---

##### `processedSchema`<sup>Required</sup> <a name="processedSchema" id="@aws-amplify/graphql-construct-alpha.AmplifyApiSchemaPreprocessorOutput.property.processedSchema"></a>

```typescript
public readonly processedSchema: string;
```

- *Type:* string

Schema generated as an output of the preprocessing step.

---

##### `processedFunctionSlots`<sup>Optional</sup> <a name="processedFunctionSlots" id="@aws-amplify/graphql-construct-alpha.AmplifyApiSchemaPreprocessorOutput.property.processedFunctionSlots"></a>

```typescript
public readonly processedFunctionSlots: MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot[];
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> | <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> | <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]

Custom functions extracted during preprocessing.

---

### AmplifyGraphqlApiCfnResources <a name="AmplifyGraphqlApiCfnResources" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources"></a>

L1 CDK resources from the API which were generated as part of the transform.

These are potentially stored under nested stacks, but presented organized by type instead.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.Initializer"></a>

```typescript
import { AmplifyGraphqlApiCfnResources } from '@aws-amplify/graphql-construct-alpha'

const amplifyGraphqlApiCfnResources: AmplifyGraphqlApiCfnResources = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.additionalCfnResources">additionalCfnResources</a></code> | <code>{[ key: string ]: aws-cdk-lib.CfnResource}</code> | Remaining L1 resources generated, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnDataSources">cfnDataSources</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_appsync.CfnDataSource}</code> | The Generated AppSync DataSource L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnFunctionConfigurations">cfnFunctionConfigurations</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_appsync.CfnFunctionConfiguration}</code> | The Generated AppSync Function L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnFunctions">cfnFunctions</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_lambda.CfnFunction}</code> | The Generated Lambda Function L1 Resources, keyed by function name. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnGraphqlApi">cfnGraphqlApi</a></code> | <code>aws-cdk-lib.aws_appsync.CfnGraphQLApi</code> | The Generated AppSync API L1 Resource. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnGraphqlSchema">cfnGraphqlSchema</a></code> | <code>aws-cdk-lib.aws_appsync.CfnGraphQLSchema</code> | The Generated AppSync Schema L1 Resource. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnResolvers">cfnResolvers</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_appsync.CfnResolver}</code> | The Generated AppSync Resolver L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnRoles">cfnRoles</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_iam.CfnRole}</code> | The Generated IAM Role L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnTables">cfnTables</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_dynamodb.CfnTable}</code> | The Generated DynamoDB Table L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnApiKey">cfnApiKey</a></code> | <code>aws-cdk-lib.aws_appsync.CfnApiKey</code> | The Generated AppSync API Key L1 Resource. |

---

##### `additionalCfnResources`<sup>Required</sup> <a name="additionalCfnResources" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.additionalCfnResources"></a>

```typescript
public readonly additionalCfnResources: {[ key: string ]: CfnResource};
```

- *Type:* {[ key: string ]: aws-cdk-lib.CfnResource}

Remaining L1 resources generated, keyed by logicalId.

---

##### `cfnDataSources`<sup>Required</sup> <a name="cfnDataSources" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnDataSources"></a>

```typescript
public readonly cfnDataSources: {[ key: string ]: CfnDataSource};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_appsync.CfnDataSource}

The Generated AppSync DataSource L1 Resources, keyed by logicalId.

---

##### `cfnFunctionConfigurations`<sup>Required</sup> <a name="cfnFunctionConfigurations" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnFunctionConfigurations"></a>

```typescript
public readonly cfnFunctionConfigurations: {[ key: string ]: CfnFunctionConfiguration};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_appsync.CfnFunctionConfiguration}

The Generated AppSync Function L1 Resources, keyed by logicalId.

---

##### `cfnFunctions`<sup>Required</sup> <a name="cfnFunctions" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnFunctions"></a>

```typescript
public readonly cfnFunctions: {[ key: string ]: CfnFunction};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_lambda.CfnFunction}

The Generated Lambda Function L1 Resources, keyed by function name.

---

##### `cfnGraphqlApi`<sup>Required</sup> <a name="cfnGraphqlApi" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnGraphqlApi"></a>

```typescript
public readonly cfnGraphqlApi: CfnGraphQLApi;
```

- *Type:* aws-cdk-lib.aws_appsync.CfnGraphQLApi

The Generated AppSync API L1 Resource.

---

##### `cfnGraphqlSchema`<sup>Required</sup> <a name="cfnGraphqlSchema" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnGraphqlSchema"></a>

```typescript
public readonly cfnGraphqlSchema: CfnGraphQLSchema;
```

- *Type:* aws-cdk-lib.aws_appsync.CfnGraphQLSchema

The Generated AppSync Schema L1 Resource.

---

##### `cfnResolvers`<sup>Required</sup> <a name="cfnResolvers" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnResolvers"></a>

```typescript
public readonly cfnResolvers: {[ key: string ]: CfnResolver};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_appsync.CfnResolver}

The Generated AppSync Resolver L1 Resources, keyed by logicalId.

---

##### `cfnRoles`<sup>Required</sup> <a name="cfnRoles" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnRoles"></a>

```typescript
public readonly cfnRoles: {[ key: string ]: CfnRole};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_iam.CfnRole}

The Generated IAM Role L1 Resources, keyed by logicalId.

---

##### `cfnTables`<sup>Required</sup> <a name="cfnTables" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnTables"></a>

```typescript
public readonly cfnTables: {[ key: string ]: CfnTable};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_dynamodb.CfnTable}

The Generated DynamoDB Table L1 Resources, keyed by logicalId.

---

##### `cfnApiKey`<sup>Optional</sup> <a name="cfnApiKey" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnApiKey"></a>

```typescript
public readonly cfnApiKey: CfnApiKey;
```

- *Type:* aws-cdk-lib.aws_appsync.CfnApiKey

The Generated AppSync API Key L1 Resource.

---

### AmplifyGraphqlApiProps <a name="AmplifyGraphqlApiProps" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps"></a>

Input props for the AmplifyGraphqlApi construct.

Specifies what the input to transform into an API, and configurations for
the transformation process.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.Initializer"></a>

```typescript
import { AmplifyGraphqlApiProps } from '@aws-amplify/graphql-construct-alpha'

const amplifyGraphqlApiProps: AmplifyGraphqlApiProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.authorizationConfig">authorizationConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationConfig">AuthorizationConfig</a></code> | Required auth config for the API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.schema">schema</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlSchema">IAmplifyGraphqlSchema</a></code> | The schema to transform in a full API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.apiName">apiName</a></code> | <code>string</code> | Name to be used for the appsync api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.conflictResolution">conflictResolution</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.ConflictResolution">ConflictResolution</a></code> | Configure conflict resolution on the API, which is required to enable DataStore API functionality. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.functionNameMap">functionNameMap</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}</code> | Lambda functions referenced in the schema's. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.functionSlots">functionSlots</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]</code> | Overrides for a given slot in the generated resolver pipelines. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.outputStorageStrategy">outputStorageStrategy</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy">IBackendOutputStorageStrategy</a></code> | Strategy to store construct outputs. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.predictionsBucket">predictionsBucket</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | If using predictions, a bucket must be provided which will be used to search for assets. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.schemaTranslationBehavior">schemaTranslationBehavior</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior">PartialSchemaTranslationBehavior</a></code> | This replaces feature flags from the API construct, for general information on what these parameters do, refer to https://docs.amplify.aws/cli/reference/feature-flags/#graphQLTransformer. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.stackMappings">stackMappings</a></code> | <code>{[ key: string ]: string}</code> | StackMappings override the assigned nested stack on a per-resource basis. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.transformers">transformers</a></code> | <code>any[]</code> | Provide a list of additional custom transformers which are injected into the transform process. |

---

##### `authorizationConfig`<sup>Required</sup> <a name="authorizationConfig" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.authorizationConfig"></a>

```typescript
public readonly authorizationConfig: AuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.AuthorizationConfig">AuthorizationConfig</a>

Required auth config for the API.

This object must be a superset of the configured auth providers in the graphql schema.
For more information, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/

---

##### `schema`<sup>Required</sup> <a name="schema" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.schema"></a>

```typescript
public readonly schema: IAmplifyGraphqlSchema;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlSchema">IAmplifyGraphqlSchema</a>

The schema to transform in a full API.

---

##### `apiName`<sup>Optional</sup> <a name="apiName" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.apiName"></a>

```typescript
public readonly apiName: string;
```

- *Type:* string

Name to be used for the appsync api.

Default: construct id.

---

##### `conflictResolution`<sup>Optional</sup> <a name="conflictResolution" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.conflictResolution"></a>

```typescript
public readonly conflictResolution: ConflictResolution;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.ConflictResolution">ConflictResolution</a>

Configure conflict resolution on the API, which is required to enable DataStore API functionality.

For more information, refer to https://docs.amplify.aws/lib/datastore/getting-started/q/platform/js/

---

##### `functionNameMap`<sup>Optional</sup> <a name="functionNameMap" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.functionNameMap"></a>

```typescript
public readonly functionNameMap: {[ key: string ]: IFunction};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}

Lambda functions referenced in the schema's.

---

##### `functionSlots`<sup>Optional</sup> <a name="functionSlots" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.functionSlots"></a>

```typescript
public readonly functionSlots: MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot[];
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> | <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> | <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]

Overrides for a given slot in the generated resolver pipelines.

For more information about what slots are available,
refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#override-amplify-generated-resolvers.

---

##### `outputStorageStrategy`<sup>Optional</sup> <a name="outputStorageStrategy" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.outputStorageStrategy"></a>

```typescript
public readonly outputStorageStrategy: IBackendOutputStorageStrategy;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy">IBackendOutputStorageStrategy</a>

Strategy to store construct outputs.

If no outputStorageStrategey is provided a default strategy will be used.

---

##### `predictionsBucket`<sup>Optional</sup> <a name="predictionsBucket" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.predictionsBucket"></a>

```typescript
public readonly predictionsBucket: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

If using predictions, a bucket must be provided which will be used to search for assets.

---

##### `schemaTranslationBehavior`<sup>Optional</sup> <a name="schemaTranslationBehavior" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.schemaTranslationBehavior"></a>

```typescript
public readonly schemaTranslationBehavior: PartialSchemaTranslationBehavior;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior">PartialSchemaTranslationBehavior</a>

This replaces feature flags from the API construct, for general information on what these parameters do, refer to https://docs.amplify.aws/cli/reference/feature-flags/#graphQLTransformer.

---

##### `stackMappings`<sup>Optional</sup> <a name="stackMappings" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.stackMappings"></a>

```typescript
public readonly stackMappings: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}

StackMappings override the assigned nested stack on a per-resource basis.

Only applies to resolvers, and takes the form
{ <logicalId>: <stackName> }
It is not recommended to use this parameter unless you are encountering stack resource count limits, and worth noting that
after initial deployment AppSync resolvers cannot be moved between nested stacks, they will need to be removed from the app,
then re-added from a new stack.

---

##### `transformers`<sup>Optional</sup> <a name="transformers" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.transformers"></a>

```typescript
public readonly transformers: any[];
```

- *Type:* any[]

Provide a list of additional custom transformers which are injected into the transform process.

---

### AmplifyGraphqlApiResources <a name="AmplifyGraphqlApiResources" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources"></a>

Accessible resources from the API which were generated as part of the transform.

These are potentially stored under nested stacks, but presented organized by type instead.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.Initializer"></a>

```typescript
import { AmplifyGraphqlApiResources } from '@aws-amplify/graphql-construct-alpha'

const amplifyGraphqlApiResources: AmplifyGraphqlApiResources = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.cfnResources">cfnResources</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources">AmplifyGraphqlApiCfnResources</a></code> | L1 Cfn Resources, for when dipping down a level of abstraction is desirable. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.functions">functions</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}</code> | The Generated Lambda Function L1 Resources, keyed by function name. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.graphqlApi">graphqlApi</a></code> | <code>aws-cdk-lib.aws_appsync.IGraphqlApi</code> | The Generated AppSync API L2 Resource, includes the Schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.nestedStacks">nestedStacks</a></code> | <code>{[ key: string ]: aws-cdk-lib.NestedStack}</code> | Nested Stacks generated by the API Construct. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.roles">roles</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_iam.IRole}</code> | The Generated IAM Role L2 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.tables">tables</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_dynamodb.ITable}</code> | The Generated DynamoDB Table L2 Resources, keyed by logicalId. |

---

##### `cfnResources`<sup>Required</sup> <a name="cfnResources" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.cfnResources"></a>

```typescript
public readonly cfnResources: AmplifyGraphqlApiCfnResources;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources">AmplifyGraphqlApiCfnResources</a>

L1 Cfn Resources, for when dipping down a level of abstraction is desirable.

---

##### `functions`<sup>Required</sup> <a name="functions" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.functions"></a>

```typescript
public readonly functions: {[ key: string ]: IFunction};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}

The Generated Lambda Function L1 Resources, keyed by function name.

---

##### `graphqlApi`<sup>Required</sup> <a name="graphqlApi" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.graphqlApi"></a>

```typescript
public readonly graphqlApi: IGraphqlApi;
```

- *Type:* aws-cdk-lib.aws_appsync.IGraphqlApi

The Generated AppSync API L2 Resource, includes the Schema.

---

##### `nestedStacks`<sup>Required</sup> <a name="nestedStacks" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.nestedStacks"></a>

```typescript
public readonly nestedStacks: {[ key: string ]: NestedStack};
```

- *Type:* {[ key: string ]: aws-cdk-lib.NestedStack}

Nested Stacks generated by the API Construct.

---

##### `roles`<sup>Required</sup> <a name="roles" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.roles"></a>

```typescript
public readonly roles: {[ key: string ]: IRole};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_iam.IRole}

The Generated IAM Role L2 Resources, keyed by logicalId.

---

##### `tables`<sup>Required</sup> <a name="tables" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.tables"></a>

```typescript
public readonly tables: {[ key: string ]: ITable};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_dynamodb.ITable}

The Generated DynamoDB Table L2 Resources, keyed by logicalId.

---

### ApiKeyAuthorizationConfig <a name="ApiKeyAuthorizationConfig" id="@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig"></a>

Configuration for API Keys on the Graphql API.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig.Initializer"></a>

```typescript
import { ApiKeyAuthorizationConfig } from '@aws-amplify/graphql-construct-alpha'

const apiKeyAuthorizationConfig: ApiKeyAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig.property.expires">expires</a></code> | <code>aws-cdk-lib.Duration</code> | A duration representing the time from Cloudformation deploy until expiry. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig.property.description">description</a></code> | <code>string</code> | Optional description for the api key to attach to the API. |

---

##### `expires`<sup>Required</sup> <a name="expires" id="@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig.property.expires"></a>

```typescript
public readonly expires: Duration;
```

- *Type:* aws-cdk-lib.Duration

A duration representing the time from Cloudformation deploy until expiry.

---

##### `description`<sup>Optional</sup> <a name="description" id="@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string

Optional description for the api key to attach to the API.

---

### AuthorizationConfig <a name="AuthorizationConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationConfig"></a>

Authorization Config to apply to the API.

At least one config must be provided, and if more than one are provided,
a defaultAuthMode must be specified.
For more information on Amplify API auth, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/#authorization-strategies

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.AuthorizationConfig.Initializer"></a>

```typescript
import { AuthorizationConfig } from '@aws-amplify/graphql-construct-alpha'

const authorizationConfig: AuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.apiKeyConfig">apiKeyConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig">ApiKeyAuthorizationConfig</a></code> | AppSync API Key config, required if a 'apiKey' auth provider is specified in the API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.defaultAuthMode">defaultAuthMode</a></code> | <code>string</code> | Default auth mode to provide to the API, required if more than one config type is specified. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.iamConfig">iamConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig">IAMAuthorizationConfig</a></code> | IAM Auth config, required if an 'iam' auth provider is specified in the API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.lambdaConfig">lambdaConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig">LambdaAuthorizationConfig</a></code> | Lambda config, required if a 'function' auth provider is specified in the API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.oidcConfig">oidcConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig">OIDCAuthorizationConfig</a></code> | Cognito OIDC config, required if a 'oidc' auth provider is specified in the API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.userPoolConfig">userPoolConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.UserPoolAuthorizationConfig">UserPoolAuthorizationConfig</a></code> | Cognito UserPool config, required if a 'userPools' auth provider is specified in the API. |

---

##### `apiKeyConfig`<sup>Optional</sup> <a name="apiKeyConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.apiKeyConfig"></a>

```typescript
public readonly apiKeyConfig: ApiKeyAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig">ApiKeyAuthorizationConfig</a>

AppSync API Key config, required if a 'apiKey' auth provider is specified in the API.

Applies to 'public' auth strategy.

---

##### `defaultAuthMode`<sup>Optional</sup> <a name="defaultAuthMode" id="@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.defaultAuthMode"></a>

```typescript
public readonly defaultAuthMode: string;
```

- *Type:* string

Default auth mode to provide to the API, required if more than one config type is specified.

---

##### `iamConfig`<sup>Optional</sup> <a name="iamConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.iamConfig"></a>

```typescript
public readonly iamConfig: IAMAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig">IAMAuthorizationConfig</a>

IAM Auth config, required if an 'iam' auth provider is specified in the API.

Applies to 'public' and 'private' auth strategies.

---

##### `lambdaConfig`<sup>Optional</sup> <a name="lambdaConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.lambdaConfig"></a>

```typescript
public readonly lambdaConfig: LambdaAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig">LambdaAuthorizationConfig</a>

Lambda config, required if a 'function' auth provider is specified in the API.

Applies to 'custom' auth strategy.

---

##### `oidcConfig`<sup>Optional</sup> <a name="oidcConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.oidcConfig"></a>

```typescript
public readonly oidcConfig: OIDCAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig">OIDCAuthorizationConfig</a>

Cognito OIDC config, required if a 'oidc' auth provider is specified in the API.

Applies to 'owner', 'private', and 'group' auth strategies.

---

##### `userPoolConfig`<sup>Optional</sup> <a name="userPoolConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationConfig.property.userPoolConfig"></a>

```typescript
public readonly userPoolConfig: UserPoolAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.UserPoolAuthorizationConfig">UserPoolAuthorizationConfig</a>

Cognito UserPool config, required if a 'userPools' auth provider is specified in the API.

Applies to 'owner', 'private', and 'group' auth strategies.

---

### AutomergeConflictResolutionStrategy <a name="AutomergeConflictResolutionStrategy" id="@aws-amplify/graphql-construct-alpha.AutomergeConflictResolutionStrategy"></a>

Enable optimistic concurrency on the project.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.AutomergeConflictResolutionStrategy.Initializer"></a>

```typescript
import { AutomergeConflictResolutionStrategy } from '@aws-amplify/graphql-construct-alpha'

const automergeConflictResolutionStrategy: AutomergeConflictResolutionStrategy = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AutomergeConflictResolutionStrategy.property.detectionType">detectionType</a></code> | <code>string</code> | The conflict detection type used for resolution. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AutomergeConflictResolutionStrategy.property.handlerType">handlerType</a></code> | <code>string</code> | This conflict resolution strategy executes an auto-merge. |

---

##### `detectionType`<sup>Required</sup> <a name="detectionType" id="@aws-amplify/graphql-construct-alpha.AutomergeConflictResolutionStrategy.property.detectionType"></a>

```typescript
public readonly detectionType: string;
```

- *Type:* string

The conflict detection type used for resolution.

---

##### `handlerType`<sup>Required</sup> <a name="handlerType" id="@aws-amplify/graphql-construct-alpha.AutomergeConflictResolutionStrategy.property.handlerType"></a>

```typescript
public readonly handlerType: string;
```

- *Type:* string

This conflict resolution strategy executes an auto-merge.

For more information, refer to https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html#conflict-detection-and-resolution

---

### BackendOutputEntry <a name="BackendOutputEntry" id="@aws-amplify/graphql-construct-alpha.BackendOutputEntry"></a>

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.BackendOutputEntry.Initializer"></a>

```typescript
import { BackendOutputEntry } from '@aws-amplify/graphql-construct-alpha'

const backendOutputEntry: BackendOutputEntry = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.BackendOutputEntry.property.payload">payload</a></code> | <code>{[ key: string ]: string}</code> | *No description.* |
| <code><a href="#@aws-amplify/graphql-construct-alpha.BackendOutputEntry.property.version">version</a></code> | <code>string</code> | *No description.* |

---

##### `payload`<sup>Required</sup> <a name="payload" id="@aws-amplify/graphql-construct-alpha.BackendOutputEntry.property.payload"></a>

```typescript
public readonly payload: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}

---

##### `version`<sup>Required</sup> <a name="version" id="@aws-amplify/graphql-construct-alpha.BackendOutputEntry.property.version"></a>

```typescript
public readonly version: string;
```

- *Type:* string

---

### ConflictResolution <a name="ConflictResolution" id="@aws-amplify/graphql-construct-alpha.ConflictResolution"></a>

Project level configuration for conflict resolution.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.ConflictResolution.Initializer"></a>

```typescript
import { ConflictResolution } from '@aws-amplify/graphql-construct-alpha'

const conflictResolution: ConflictResolution = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.ConflictResolution.property.models">models</a></code> | <code>{[ key: string ]: <a href="#@aws-amplify/graphql-construct-alpha.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-construct-alpha.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a>}</code> | Model-specific conflict resolution overrides. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.ConflictResolution.property.project">project</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-construct-alpha.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a></code> | Project-wide config for conflict resolution. |

---

##### `models`<sup>Optional</sup> <a name="models" id="@aws-amplify/graphql-construct-alpha.ConflictResolution.property.models"></a>

```typescript
public readonly models: {[ key: string ]: AutomergeConflictResolutionStrategy | OptimisticConflictResolutionStrategy | CustomConflictResolutionStrategy};
```

- *Type:* {[ key: string ]: <a href="#@aws-amplify/graphql-construct-alpha.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-construct-alpha.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a>}

Model-specific conflict resolution overrides.

---

##### `project`<sup>Optional</sup> <a name="project" id="@aws-amplify/graphql-construct-alpha.ConflictResolution.property.project"></a>

```typescript
public readonly project: AutomergeConflictResolutionStrategy | OptimisticConflictResolutionStrategy | CustomConflictResolutionStrategy;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-construct-alpha.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a>

Project-wide config for conflict resolution.

Applies to all non-overridden models.

---

### ConflictResolutionStrategyBase <a name="ConflictResolutionStrategyBase" id="@aws-amplify/graphql-construct-alpha.ConflictResolutionStrategyBase"></a>

Common parameters for conflict resolution.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.ConflictResolutionStrategyBase.Initializer"></a>

```typescript
import { ConflictResolutionStrategyBase } from '@aws-amplify/graphql-construct-alpha'

const conflictResolutionStrategyBase: ConflictResolutionStrategyBase = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.ConflictResolutionStrategyBase.property.detectionType">detectionType</a></code> | <code>string</code> | The conflict detection type used for resolution. |

---

##### `detectionType`<sup>Required</sup> <a name="detectionType" id="@aws-amplify/graphql-construct-alpha.ConflictResolutionStrategyBase.property.detectionType"></a>

```typescript
public readonly detectionType: string;
```

- *Type:* string

The conflict detection type used for resolution.

---

### CustomConflictResolutionStrategy <a name="CustomConflictResolutionStrategy" id="@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy"></a>

Enable custom sync on the project, powered by a lambda.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy.Initializer"></a>

```typescript
import { CustomConflictResolutionStrategy } from '@aws-amplify/graphql-construct-alpha'

const customConflictResolutionStrategy: CustomConflictResolutionStrategy = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy.property.detectionType">detectionType</a></code> | <code>string</code> | The conflict detection type used for resolution. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy.property.conflictHandler">conflictHandler</a></code> | <code>aws-cdk-lib.aws_lambda.IFunction</code> | The function which will be invoked for conflict resolution. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy.property.handlerType">handlerType</a></code> | <code>string</code> | This conflict resolution strategy uses a lambda handler type. |

---

##### `detectionType`<sup>Required</sup> <a name="detectionType" id="@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy.property.detectionType"></a>

```typescript
public readonly detectionType: string;
```

- *Type:* string

The conflict detection type used for resolution.

---

##### `conflictHandler`<sup>Required</sup> <a name="conflictHandler" id="@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy.property.conflictHandler"></a>

```typescript
public readonly conflictHandler: IFunction;
```

- *Type:* aws-cdk-lib.aws_lambda.IFunction

The function which will be invoked for conflict resolution.

---

##### `handlerType`<sup>Required</sup> <a name="handlerType" id="@aws-amplify/graphql-construct-alpha.CustomConflictResolutionStrategy.property.handlerType"></a>

```typescript
public readonly handlerType: string;
```

- *Type:* string

This conflict resolution strategy uses a lambda handler type.

For more information, refer to https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html#conflict-detection-and-resolution

---

### FunctionSlotBase <a name="FunctionSlotBase" id="@aws-amplify/graphql-construct-alpha.FunctionSlotBase"></a>

Common slot parameters.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.FunctionSlotBase.Initializer"></a>

```typescript
import { FunctionSlotBase } from '@aws-amplify/graphql-construct-alpha'

const functionSlotBase: FunctionSlotBase = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotBase.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotBase.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotBase.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-construct-alpha.FunctionSlotBase.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the schema.

---

##### `function`<sup>Required</sup> <a name="function" id="@aws-amplify/graphql-construct-alpha.FunctionSlotBase.property.function"></a>

```typescript
public readonly function: FunctionSlotOverride;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a>

The overridden behavior for this slot.

---

##### `slotIndex`<sup>Required</sup> <a name="slotIndex" id="@aws-amplify/graphql-construct-alpha.FunctionSlotBase.property.slotIndex"></a>

```typescript
public readonly slotIndex: number;
```

- *Type:* number

The slot index to use to inject this into the execution pipeline.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

### FunctionSlotOverride <a name="FunctionSlotOverride" id="@aws-amplify/graphql-construct-alpha.FunctionSlotOverride"></a>

Params exposed to support configuring and overriding pipelined slots.

This allows configuration of the underlying function,
including the request and response mapping templates.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.FunctionSlotOverride.Initializer"></a>

```typescript
import { FunctionSlotOverride } from '@aws-amplify/graphql-construct-alpha'

const functionSlotOverride: FunctionSlotOverride = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride.property.requestMappingTemplate">requestMappingTemplate</a></code> | <code>aws-cdk-lib.aws_appsync.MappingTemplate</code> | Override request mapping template for the function slot. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride.property.responseMappingTemplate">responseMappingTemplate</a></code> | <code>aws-cdk-lib.aws_appsync.MappingTemplate</code> | Override response mapping template for the function slot. |

---

##### `requestMappingTemplate`<sup>Optional</sup> <a name="requestMappingTemplate" id="@aws-amplify/graphql-construct-alpha.FunctionSlotOverride.property.requestMappingTemplate"></a>

```typescript
public readonly requestMappingTemplate: MappingTemplate;
```

- *Type:* aws-cdk-lib.aws_appsync.MappingTemplate

Override request mapping template for the function slot.

Executed before the datasource is invoked.

---

##### `responseMappingTemplate`<sup>Optional</sup> <a name="responseMappingTemplate" id="@aws-amplify/graphql-construct-alpha.FunctionSlotOverride.property.responseMappingTemplate"></a>

```typescript
public readonly responseMappingTemplate: MappingTemplate;
```

- *Type:* aws-cdk-lib.aws_appsync.MappingTemplate

Override response mapping template for the function slot.

Executed after the datasource is invoked.

---

### IAMAuthorizationConfig <a name="IAMAuthorizationConfig" id="@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig"></a>

Configuration for IAM Authorization on the Graphql API.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.Initializer"></a>

```typescript
import { IAMAuthorizationConfig } from '@aws-amplify/graphql-construct-alpha'

const iAMAuthorizationConfig: IAMAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.adminRoles">adminRoles</a></code> | <code>aws-cdk-lib.aws_iam.IRole[]</code> | A list of roles granted full R/W access to the API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.authenticatedUserRole">authenticatedUserRole</a></code> | <code>aws-cdk-lib.aws_iam.IRole</code> | Authenticated user role, applies to { provider: iam, allow: private } access. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.identityPoolId">identityPoolId</a></code> | <code>string</code> | ID for the Cognito Identity Pool vending auth and unauth roles. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.unauthenticatedUserRole">unauthenticatedUserRole</a></code> | <code>aws-cdk-lib.aws_iam.IRole</code> | Unauthenticated user role, applies to { provider: iam, allow: public } access. |

---

##### `adminRoles`<sup>Optional</sup> <a name="adminRoles" id="@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.adminRoles"></a>

```typescript
public readonly adminRoles: IRole[];
```

- *Type:* aws-cdk-lib.aws_iam.IRole[]

A list of roles granted full R/W access to the API.

---

##### `authenticatedUserRole`<sup>Optional</sup> <a name="authenticatedUserRole" id="@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.authenticatedUserRole"></a>

```typescript
public readonly authenticatedUserRole: IRole;
```

- *Type:* aws-cdk-lib.aws_iam.IRole

Authenticated user role, applies to { provider: iam, allow: private } access.

---

##### `identityPoolId`<sup>Optional</sup> <a name="identityPoolId" id="@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.identityPoolId"></a>

```typescript
public readonly identityPoolId: string;
```

- *Type:* string

ID for the Cognito Identity Pool vending auth and unauth roles.

---

##### `unauthenticatedUserRole`<sup>Optional</sup> <a name="unauthenticatedUserRole" id="@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.unauthenticatedUserRole"></a>

```typescript
public readonly unauthenticatedUserRole: IRole;
```

- *Type:* aws-cdk-lib.aws_iam.IRole

Unauthenticated user role, applies to { provider: iam, allow: public } access.

---

### LambdaAuthorizationConfig <a name="LambdaAuthorizationConfig" id="@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig"></a>

Configuration for Custom Lambda authorization on the Graphql API.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig.Initializer"></a>

```typescript
import { LambdaAuthorizationConfig } from '@aws-amplify/graphql-construct-alpha'

const lambdaAuthorizationConfig: LambdaAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig.property.function">function</a></code> | <code>aws-cdk-lib.aws_lambda.IFunction</code> | The authorizer lambda function. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig.property.ttl">ttl</a></code> | <code>aws-cdk-lib.Duration</code> | How long the results are cached. |

---

##### `function`<sup>Required</sup> <a name="function" id="@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig.property.function"></a>

```typescript
public readonly function: IFunction;
```

- *Type:* aws-cdk-lib.aws_lambda.IFunction

The authorizer lambda function.

---

##### `ttl`<sup>Required</sup> <a name="ttl" id="@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig.property.ttl"></a>

```typescript
public readonly ttl: Duration;
```

- *Type:* aws-cdk-lib.Duration

How long the results are cached.

---

### MutationFunctionSlot <a name="MutationFunctionSlot" id="@aws-amplify/graphql-construct-alpha.MutationFunctionSlot"></a>

Slot types for Mutation Resolvers.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.Initializer"></a>

```typescript
import { MutationFunctionSlot } from '@aws-amplify/graphql-construct-alpha'

const mutationFunctionSlot: MutationFunctionSlot = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.slotName">slotName</a></code> | <code>string</code> | The slot name to inject this behavior into. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.typeName">typeName</a></code> | <code>string</code> | This slot type applies to the Mutation type on the schema. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the schema.

---

##### `function`<sup>Required</sup> <a name="function" id="@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.function"></a>

```typescript
public readonly function: FunctionSlotOverride;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a>

The overridden behavior for this slot.

---

##### `slotIndex`<sup>Required</sup> <a name="slotIndex" id="@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.slotIndex"></a>

```typescript
public readonly slotIndex: number;
```

- *Type:* number

The slot index to use to inject this into the execution pipeline.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `slotName`<sup>Required</sup> <a name="slotName" id="@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.slotName"></a>

```typescript
public readonly slotName: string;
```

- *Type:* string

The slot name to inject this behavior into.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `typeName`<sup>Required</sup> <a name="typeName" id="@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.typeName"></a>

```typescript
public readonly typeName: string;
```

- *Type:* string

This slot type applies to the Mutation type on the schema.

---

### OIDCAuthorizationConfig <a name="OIDCAuthorizationConfig" id="@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig"></a>

Configuration for OpenId Connect Authorization on the Graphql API.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.Initializer"></a>

```typescript
import { OIDCAuthorizationConfig } from '@aws-amplify/graphql-construct-alpha'

const oIDCAuthorizationConfig: OIDCAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.property.oidcIssuerUrl">oidcIssuerUrl</a></code> | <code>string</code> | Url for the OIDC token issuer. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.property.oidcProviderName">oidcProviderName</a></code> | <code>string</code> | The issuer for the OIDC configuration. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.property.tokenExpiryFromAuth">tokenExpiryFromAuth</a></code> | <code>aws-cdk-lib.Duration</code> | The duration an OIDC token is valid after being authenticated by OIDC provider. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.property.tokenExpiryFromIssue">tokenExpiryFromIssue</a></code> | <code>aws-cdk-lib.Duration</code> | The duration an OIDC token is valid after being issued to a user. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.property.clientId">clientId</a></code> | <code>string</code> | The client identifier of the Relying party at the OpenID identity provider. |

---

##### `oidcIssuerUrl`<sup>Required</sup> <a name="oidcIssuerUrl" id="@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.property.oidcIssuerUrl"></a>

```typescript
public readonly oidcIssuerUrl: string;
```

- *Type:* string

Url for the OIDC token issuer.

---

##### `oidcProviderName`<sup>Required</sup> <a name="oidcProviderName" id="@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.property.oidcProviderName"></a>

```typescript
public readonly oidcProviderName: string;
```

- *Type:* string

The issuer for the OIDC configuration.

---

##### `tokenExpiryFromAuth`<sup>Required</sup> <a name="tokenExpiryFromAuth" id="@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.property.tokenExpiryFromAuth"></a>

```typescript
public readonly tokenExpiryFromAuth: Duration;
```

- *Type:* aws-cdk-lib.Duration

The duration an OIDC token is valid after being authenticated by OIDC provider.

auth_time claim in OIDC token is required for this validation to work.

---

##### `tokenExpiryFromIssue`<sup>Required</sup> <a name="tokenExpiryFromIssue" id="@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.property.tokenExpiryFromIssue"></a>

```typescript
public readonly tokenExpiryFromIssue: Duration;
```

- *Type:* aws-cdk-lib.Duration

The duration an OIDC token is valid after being issued to a user.

This validation uses iat claim of OIDC token.

---

##### `clientId`<sup>Optional</sup> <a name="clientId" id="@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig.property.clientId"></a>

```typescript
public readonly clientId: string;
```

- *Type:* string

The client identifier of the Relying party at the OpenID identity provider.

A regular expression can be specified so AppSync can validate against multiple client identifiers at a time. Example

---

### OptimisticConflictResolutionStrategy <a name="OptimisticConflictResolutionStrategy" id="@aws-amplify/graphql-construct-alpha.OptimisticConflictResolutionStrategy"></a>

Enable automerge on the project.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.OptimisticConflictResolutionStrategy.Initializer"></a>

```typescript
import { OptimisticConflictResolutionStrategy } from '@aws-amplify/graphql-construct-alpha'

const optimisticConflictResolutionStrategy: OptimisticConflictResolutionStrategy = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.OptimisticConflictResolutionStrategy.property.detectionType">detectionType</a></code> | <code>string</code> | The conflict detection type used for resolution. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.OptimisticConflictResolutionStrategy.property.handlerType">handlerType</a></code> | <code>string</code> | This conflict resolution strategy the _version to perform optimistic concurrency. |

---

##### `detectionType`<sup>Required</sup> <a name="detectionType" id="@aws-amplify/graphql-construct-alpha.OptimisticConflictResolutionStrategy.property.detectionType"></a>

```typescript
public readonly detectionType: string;
```

- *Type:* string

The conflict detection type used for resolution.

---

##### `handlerType`<sup>Required</sup> <a name="handlerType" id="@aws-amplify/graphql-construct-alpha.OptimisticConflictResolutionStrategy.property.handlerType"></a>

```typescript
public readonly handlerType: string;
```

- *Type:* string

This conflict resolution strategy the _version to perform optimistic concurrency.

For more information, refer to https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html#conflict-detection-and-resolution

---

### PartialSchemaTranslationBehavior <a name="PartialSchemaTranslationBehavior" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior"></a>

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.Initializer"></a>

```typescript
import { PartialSchemaTranslationBehavior } from '@aws-amplify/graphql-construct-alpha'

const partialSchemaTranslationBehavior: PartialSchemaTranslationBehavior = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.disableResolverDeduping">disableResolverDeduping</a></code> | <code>boolean</code> | Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.enableAutoIndexQueryNames">enableAutoIndexQueryNames</a></code> | <code>boolean</code> | Automate generation of query names, and as a result attaching all indexes as queries to the generated API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.enableSearchNodeToNodeEncryption">enableSearchNodeToNodeEncryption</a></code> | <code>boolean</code> | If enabled, set nodeToNodeEncryption on the searchable domain (if one exists). |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.populateOwnerFieldForStaticGroupAuth">populateOwnerFieldForStaticGroupAuth</a></code> | <code>boolean</code> | Ensure that the owner field is still populated even if a static iam or group authorization applies. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField">respectPrimaryKeyAttributesOnConnectionField</a></code> | <code>boolean</code> | Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.sandboxModeEnabled">sandboxModeEnabled</a></code> | <code>boolean</code> | Enabling sandbox mode will enable api key auth on all models in the transformed schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.secondaryKeyAsGSI">secondaryKeyAsGSI</a></code> | <code>boolean</code> | If disabled, generated. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults">shouldDeepMergeDirectiveConfigDefaults</a></code> | <code>boolean</code> | Restore parity w/ GQLv1. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.suppressApiKeyGeneration">suppressApiKeyGeneration</a></code> | <code>boolean</code> | If enabled, disable api key resource generation even if specified as an auth rule on the construct. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.useSubUsernameForDefaultIdentityClaim">useSubUsernameForDefaultIdentityClaim</a></code> | <code>boolean</code> | Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool. |

---

##### `disableResolverDeduping`<sup>Optional</sup> <a name="disableResolverDeduping" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.disableResolverDeduping"></a>

```typescript
public readonly disableResolverDeduping: boolean;
```

- *Type:* boolean

Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered.

---

##### `enableAutoIndexQueryNames`<sup>Optional</sup> <a name="enableAutoIndexQueryNames" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.enableAutoIndexQueryNames"></a>

```typescript
public readonly enableAutoIndexQueryNames: boolean;
```

- *Type:* boolean

Automate generation of query names, and as a result attaching all indexes as queries to the generated API.

If enabled,

---

##### `enableSearchNodeToNodeEncryption`<sup>Optional</sup> <a name="enableSearchNodeToNodeEncryption" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.enableSearchNodeToNodeEncryption"></a>

```typescript
public readonly enableSearchNodeToNodeEncryption: boolean;
```

- *Type:* boolean

If enabled, set nodeToNodeEncryption on the searchable domain (if one exists).

Not recommended for use, prefer
to use `Object.values(resources.additionalResources['AWS::Elasticsearch::Domain']).forEach((domain: CfnDomain) => {
  domain.NodeToNodeEncryptionOptions = { Enabled: True };
});

---

##### `populateOwnerFieldForStaticGroupAuth`<sup>Optional</sup> <a name="populateOwnerFieldForStaticGroupAuth" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.populateOwnerFieldForStaticGroupAuth"></a>

```typescript
public readonly populateOwnerFieldForStaticGroupAuth: boolean;
```

- *Type:* boolean

Ensure that the owner field is still populated even if a static iam or group authorization applies.

---

##### `respectPrimaryKeyAttributesOnConnectionField`<sup>Optional</sup> <a name="respectPrimaryKeyAttributesOnConnectionField" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField"></a>

```typescript
public readonly respectPrimaryKeyAttributesOnConnectionField: boolean;
```

- *Type:* boolean

Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.

---

##### `sandboxModeEnabled`<sup>Optional</sup> <a name="sandboxModeEnabled" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.sandboxModeEnabled"></a>

```typescript
public readonly sandboxModeEnabled: boolean;
```

- *Type:* boolean

Enabling sandbox mode will enable api key auth on all models in the transformed schema.

---

##### `secondaryKeyAsGSI`<sup>Optional</sup> <a name="secondaryKeyAsGSI" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.secondaryKeyAsGSI"></a>

```typescript
public readonly secondaryKeyAsGSI: boolean;
```

- *Type:* boolean

If disabled, generated.

---

##### `shouldDeepMergeDirectiveConfigDefaults`<sup>Optional</sup> <a name="shouldDeepMergeDirectiveConfigDefaults" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults"></a>

```typescript
public readonly shouldDeepMergeDirectiveConfigDefaults: boolean;
```

- *Type:* boolean

Restore parity w/ GQLv1.

---

##### `suppressApiKeyGeneration`<sup>Optional</sup> <a name="suppressApiKeyGeneration" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.suppressApiKeyGeneration"></a>

```typescript
public readonly suppressApiKeyGeneration: boolean;
```

- *Type:* boolean

If enabled, disable api key resource generation even if specified as an auth rule on the construct.

This is a legacy parameter from the Graphql Transformer existing in Amplify CLI, not recommended to change.

---

##### `useSubUsernameForDefaultIdentityClaim`<sup>Optional</sup> <a name="useSubUsernameForDefaultIdentityClaim" id="@aws-amplify/graphql-construct-alpha.PartialSchemaTranslationBehavior.property.useSubUsernameForDefaultIdentityClaim"></a>

```typescript
public readonly useSubUsernameForDefaultIdentityClaim: boolean;
```

- *Type:* boolean

Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool.

---

### QueryFunctionSlot <a name="QueryFunctionSlot" id="@aws-amplify/graphql-construct-alpha.QueryFunctionSlot"></a>

Slot types for Query Resolvers.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.Initializer"></a>

```typescript
import { QueryFunctionSlot } from '@aws-amplify/graphql-construct-alpha'

const queryFunctionSlot: QueryFunctionSlot = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.slotName">slotName</a></code> | <code>string</code> | The slot name to inject this behavior into. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.typeName">typeName</a></code> | <code>string</code> | This slot type applies to the Query type on the schema. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the schema.

---

##### `function`<sup>Required</sup> <a name="function" id="@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.function"></a>

```typescript
public readonly function: FunctionSlotOverride;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a>

The overridden behavior for this slot.

---

##### `slotIndex`<sup>Required</sup> <a name="slotIndex" id="@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.slotIndex"></a>

```typescript
public readonly slotIndex: number;
```

- *Type:* number

The slot index to use to inject this into the execution pipeline.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `slotName`<sup>Required</sup> <a name="slotName" id="@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.slotName"></a>

```typescript
public readonly slotName: string;
```

- *Type:* string

The slot name to inject this behavior into.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `typeName`<sup>Required</sup> <a name="typeName" id="@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.typeName"></a>

```typescript
public readonly typeName: string;
```

- *Type:* string

This slot type applies to the Query type on the schema.

---

### SchemaTranslationBehavior <a name="SchemaTranslationBehavior" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior"></a>

Strongly typed set of shared parameters for all transformers, and core layer.

This is intended to replace feature flags, to ensure param coercion happens in
a single location, and isn't spread around the transformers, where they can
have different default behaviors.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.Initializer"></a>

```typescript
import { SchemaTranslationBehavior } from '@aws-amplify/graphql-construct-alpha'

const schemaTranslationBehavior: SchemaTranslationBehavior = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.disableResolverDeduping">disableResolverDeduping</a></code> | <code>boolean</code> | Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.enableAutoIndexQueryNames">enableAutoIndexQueryNames</a></code> | <code>boolean</code> | Automate generation of query names, and as a result attaching all indexes as queries to the generated API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.enableSearchNodeToNodeEncryption">enableSearchNodeToNodeEncryption</a></code> | <code>boolean</code> | If enabled, set nodeToNodeEncryption on the searchable domain (if one exists). |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.populateOwnerFieldForStaticGroupAuth">populateOwnerFieldForStaticGroupAuth</a></code> | <code>boolean</code> | Ensure that the owner field is still populated even if a static iam or group authorization applies. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField">respectPrimaryKeyAttributesOnConnectionField</a></code> | <code>boolean</code> | Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.sandboxModeEnabled">sandboxModeEnabled</a></code> | <code>boolean</code> | Enabling sandbox mode will enable api key auth on all models in the transformed schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.secondaryKeyAsGSI">secondaryKeyAsGSI</a></code> | <code>boolean</code> | If disabled, generated. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults">shouldDeepMergeDirectiveConfigDefaults</a></code> | <code>boolean</code> | Restore parity w/ GQLv1. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.suppressApiKeyGeneration">suppressApiKeyGeneration</a></code> | <code>boolean</code> | If enabled, disable api key resource generation even if specified as an auth rule on the construct. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.useSubUsernameForDefaultIdentityClaim">useSubUsernameForDefaultIdentityClaim</a></code> | <code>boolean</code> | Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool. |

---

##### `disableResolverDeduping`<sup>Required</sup> <a name="disableResolverDeduping" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.disableResolverDeduping"></a>

```typescript
public readonly disableResolverDeduping: boolean;
```

- *Type:* boolean

Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered.

---

##### `enableAutoIndexQueryNames`<sup>Required</sup> <a name="enableAutoIndexQueryNames" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.enableAutoIndexQueryNames"></a>

```typescript
public readonly enableAutoIndexQueryNames: boolean;
```

- *Type:* boolean

Automate generation of query names, and as a result attaching all indexes as queries to the generated API.

If enabled,

---

##### `enableSearchNodeToNodeEncryption`<sup>Required</sup> <a name="enableSearchNodeToNodeEncryption" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.enableSearchNodeToNodeEncryption"></a>

```typescript
public readonly enableSearchNodeToNodeEncryption: boolean;
```

- *Type:* boolean

If enabled, set nodeToNodeEncryption on the searchable domain (if one exists).

Not recommended for use, prefer
to use `Object.values(resources.additionalResources['AWS::Elasticsearch::Domain']).forEach((domain: CfnDomain) => {
  domain.NodeToNodeEncryptionOptions = { Enabled: True };
});

---

##### `populateOwnerFieldForStaticGroupAuth`<sup>Required</sup> <a name="populateOwnerFieldForStaticGroupAuth" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.populateOwnerFieldForStaticGroupAuth"></a>

```typescript
public readonly populateOwnerFieldForStaticGroupAuth: boolean;
```

- *Type:* boolean

Ensure that the owner field is still populated even if a static iam or group authorization applies.

---

##### `respectPrimaryKeyAttributesOnConnectionField`<sup>Required</sup> <a name="respectPrimaryKeyAttributesOnConnectionField" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField"></a>

```typescript
public readonly respectPrimaryKeyAttributesOnConnectionField: boolean;
```

- *Type:* boolean

Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.

---

##### `sandboxModeEnabled`<sup>Required</sup> <a name="sandboxModeEnabled" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.sandboxModeEnabled"></a>

```typescript
public readonly sandboxModeEnabled: boolean;
```

- *Type:* boolean

Enabling sandbox mode will enable api key auth on all models in the transformed schema.

---

##### `secondaryKeyAsGSI`<sup>Required</sup> <a name="secondaryKeyAsGSI" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.secondaryKeyAsGSI"></a>

```typescript
public readonly secondaryKeyAsGSI: boolean;
```

- *Type:* boolean

If disabled, generated.

---

##### `shouldDeepMergeDirectiveConfigDefaults`<sup>Required</sup> <a name="shouldDeepMergeDirectiveConfigDefaults" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults"></a>

```typescript
public readonly shouldDeepMergeDirectiveConfigDefaults: boolean;
```

- *Type:* boolean

Restore parity w/ GQLv1.

---

##### `suppressApiKeyGeneration`<sup>Required</sup> <a name="suppressApiKeyGeneration" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.suppressApiKeyGeneration"></a>

```typescript
public readonly suppressApiKeyGeneration: boolean;
```

- *Type:* boolean

If enabled, disable api key resource generation even if specified as an auth rule on the construct.

This is a legacy parameter from the Graphql Transformer existing in Amplify CLI, not recommended to change.

---

##### `useSubUsernameForDefaultIdentityClaim`<sup>Required</sup> <a name="useSubUsernameForDefaultIdentityClaim" id="@aws-amplify/graphql-construct-alpha.SchemaTranslationBehavior.property.useSubUsernameForDefaultIdentityClaim"></a>

```typescript
public readonly useSubUsernameForDefaultIdentityClaim: boolean;
```

- *Type:* boolean

Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool.

---

### SubscriptionFunctionSlot <a name="SubscriptionFunctionSlot" id="@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot"></a>

Slot types for Subscription Resolvers.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.Initializer"></a>

```typescript
import { SubscriptionFunctionSlot } from '@aws-amplify/graphql-construct-alpha'

const subscriptionFunctionSlot: SubscriptionFunctionSlot = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.slotName">slotName</a></code> | <code>string</code> | The slot name to inject this behavior into. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.typeName">typeName</a></code> | <code>string</code> | This slot type applies to the Subscription type on the schema. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the schema.

---

##### `function`<sup>Required</sup> <a name="function" id="@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.function"></a>

```typescript
public readonly function: FunctionSlotOverride;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a>

The overridden behavior for this slot.

---

##### `slotIndex`<sup>Required</sup> <a name="slotIndex" id="@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.slotIndex"></a>

```typescript
public readonly slotIndex: number;
```

- *Type:* number

The slot index to use to inject this into the execution pipeline.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `slotName`<sup>Required</sup> <a name="slotName" id="@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.slotName"></a>

```typescript
public readonly slotName: string;
```

- *Type:* string

The slot name to inject this behavior into.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `typeName`<sup>Required</sup> <a name="typeName" id="@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.typeName"></a>

```typescript
public readonly typeName: string;
```

- *Type:* string

This slot type applies to the Subscription type on the schema.

---

### UserPoolAuthorizationConfig <a name="UserPoolAuthorizationConfig" id="@aws-amplify/graphql-construct-alpha.UserPoolAuthorizationConfig"></a>

Configuration for Cognito UserPool Authorization on the Graphql API.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.UserPoolAuthorizationConfig.Initializer"></a>

```typescript
import { UserPoolAuthorizationConfig } from '@aws-amplify/graphql-construct-alpha'

const userPoolAuthorizationConfig: UserPoolAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.UserPoolAuthorizationConfig.property.userPool">userPool</a></code> | <code>aws-cdk-lib.aws_cognito.IUserPool</code> | The Cognito User Pool which is used to authenticated JWT tokens, and vends group and user information. |

---

##### `userPool`<sup>Required</sup> <a name="userPool" id="@aws-amplify/graphql-construct-alpha.UserPoolAuthorizationConfig.property.userPool"></a>

```typescript
public readonly userPool: IUserPool;
```

- *Type:* aws-cdk-lib.aws_cognito.IUserPool

The Cognito User Pool which is used to authenticated JWT tokens, and vends group and user information.

---

## Classes <a name="Classes" id="Classes"></a>

### AmplifyGraphqlSchema <a name="AmplifyGraphqlSchema" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlSchema"></a>

Class exposing utilities to produce IAmplifyGraphqlSchema objects given various inputs.

#### Initializers <a name="Initializers" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlSchema.Initializer"></a>

```typescript
import { AmplifyGraphqlSchema } from '@aws-amplify/graphql-construct-alpha'

new AmplifyGraphqlSchema()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlSchema.fromSchemaFiles">fromSchemaFiles</a></code> | Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlSchema.fromString">fromString</a></code> | Produce a schema definition from a string input. |

---

##### `fromSchemaFiles` <a name="fromSchemaFiles" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlSchema.fromSchemaFiles"></a>

```typescript
import { AmplifyGraphqlSchema } from '@aws-amplify/graphql-construct-alpha'

AmplifyGraphqlSchema.fromSchemaFiles(schemaFiles: SchemaFile)
```

Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema.

###### `schemaFiles`<sup>Required</sup> <a name="schemaFiles" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlSchema.fromSchemaFiles.parameter.schemaFiles"></a>

- *Type:* aws-cdk-lib.aws_appsync.SchemaFile

the schema files to process.

---

##### `fromString` <a name="fromString" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlSchema.fromString"></a>

```typescript
import { AmplifyGraphqlSchema } from '@aws-amplify/graphql-construct-alpha'

AmplifyGraphqlSchema.fromString(schema: string)
```

Produce a schema definition from a string input.

###### `schema`<sup>Required</sup> <a name="schema" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlSchema.fromString.parameter.schema"></a>

- *Type:* string

the graphql input as a string.

---



## Protocols <a name="Protocols" id="Protocols"></a>

### IAmplifyGraphqlSchema <a name="IAmplifyGraphqlSchema" id="@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlSchema"></a>

- *Implemented By:* <a href="#@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlSchema">IAmplifyGraphqlSchema</a>

Graphql schema definition, which can be implemented in multiple ways.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlSchema.property.definition">definition</a></code> | <code>string</code> | Return the schema definition as a graphql string. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlSchema.property.functionSlots">functionSlots</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]</code> | Retrieve any function slots defined explicitly in the schema. |

---

##### `definition`<sup>Required</sup> <a name="definition" id="@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlSchema.property.definition"></a>

```typescript
public readonly definition: string;
```

- *Type:* string

Return the schema definition as a graphql string.

---

##### `functionSlots`<sup>Required</sup> <a name="functionSlots" id="@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlSchema.property.functionSlots"></a>

```typescript
public readonly functionSlots: MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot[];
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> | <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> | <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]

Retrieve any function slots defined explicitly in the schema.

---

### IBackendOutputStorageStrategy <a name="IBackendOutputStorageStrategy" id="@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy"></a>

- *Implemented By:* <a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy">IBackendOutputStorageStrategy</a>

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy.addBackendOutputEntry">addBackendOutputEntry</a></code> | Add an entry to backend output. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy.flush">flush</a></code> | Write all pending data to the destination. |

---

##### `addBackendOutputEntry` <a name="addBackendOutputEntry" id="@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy.addBackendOutputEntry"></a>

```typescript
public addBackendOutputEntry(keyName: string, strategy: BackendOutputEntry): void
```

Add an entry to backend output.

###### `keyName`<sup>Required</sup> <a name="keyName" id="@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy.addBackendOutputEntry.parameter.keyName"></a>

- *Type:* string

the key.

---

###### `strategy`<sup>Required</sup> <a name="strategy" id="@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy.addBackendOutputEntry.parameter.strategy"></a>

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.BackendOutputEntry">BackendOutputEntry</a>

the backend output strategy information.

---

##### `flush` <a name="flush" id="@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy.flush"></a>

```typescript
public flush(): void
```

Write all pending data to the destination.


