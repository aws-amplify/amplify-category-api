# Amplify Graphql API Construct

[![View on Construct Hub](https://constructs.dev/badge?package=%40aws-amplify%2Fgraphql-construct-alpha)](https://constructs.dev/packages/@aws-amplify/graphql-construct-alpha)

This package vends an L3 CDK Construct wrapping the behavior of the Amplify GraphQL Transformer. This enables quick development and interation of AppSync APIs which support the Amplify GraphQL Directives. For more information on schema modeling in GraphQL, please refer to the [amplify developer docs](https://docs.amplify.aws/cli/graphql/overview/).

The primary way to use this construct is to invoke it with a provided schema (either as an inline graphql string, or as one or more `appsync.SchemaFile`) objects, and with authorization config provided. There are 5 supported methods for authorization of an AppSync API, all of which are supported by this construct. For more information on authorization rule definitions in Amplify, refer to the [authorization docs](https://docs.amplify.aws/cli/graphql/authorization-rules/). Note: currently at least one authorization rule is required, and if multiple are specified, a `defaultAuthorizationMode` must be specified on the api as well. Specified authorization modes must be a superset of those configured in the graphql schema.

## Examples

### Simple Todo List With Cognito Userpool-based Owner Authorization

In this example, we create a single model, which will use `user pool` auth in order to allow logged in users to create and manage their own `todos` privately.

We create a cdk App and Stack, though you may be deploying this to a custom stack, this is purely illustrative for a concise demo.

We then wire this through to import a user pool which was already deployed (creating and deploying is out of scope for this example).

```ts
import { App, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-construct-alpha';

const app = new App();
const stack = new Stack(app, 'TodoStack');

new AmplifyGraphqlApi(stack, 'TodoApp', {
  schema: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: owner }]) {
      description: String!
      completed: Boolean
    }
  `),
  authorizationModes: {
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
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-construct-alpha';

const app = new App();
const stack = new Stack(app, 'BlogStack');

new AmplifyGraphqlApi(stack, 'BlogApp', {
  schema: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
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
  authorizationModes: {
    defaultAuthorizationMode: 'API_KEY',
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

### Import GraphQL Schema from files, instead of inline.

In this example, we import the schema definition itself from one or more local file, rather than an inline graphql string.

```graphql
# todo.graphql
type Todo @model @auth(rules: [{ allow: owner }]) {
  content: String!
  done: Boolean
}
```

```graphql
# blog.graphql
type Blog @model @auth(rules: [{ allow: owner }, { allow: public, operations: [read] }]) {
  title: String!
  description: String
  posts: [Post] @hasMany
}

type Post @model @auth(rules: [{ allow: owner }, { allow: public, operations: [read] }]) {
  title: String!
  content: [String]
  blog: Blog @belongsTo
}
```

```ts
// app.ts
import { App, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-construct-alpha';

const app = new App();
const stack = new Stack(app, 'MultiFileStack');

new AmplifyGraphqlApi(stack, 'MultiFileDefinition', {
  schema: AmplifyGraphqlDefinition.fromFiles(path.join(__dirname, 'todo.graphql'), path.join(__dirname, 'blog.graphql')),
  authorizationModes: {
    defaultAuthorizationMode: 'API_KEY',
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
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | the scope to create this construct within. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.id">id</a></code> | <code>string</code> | the id to use for this api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.props">props</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps">AmplifyGraphqlApiProps</a></code> | the properties used to configure the generated api. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

the scope to create this construct within.

---

##### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.id"></a>

- *Type:* string

the id to use for this api.

---

##### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.Initializer.parameter.props"></a>

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps">AmplifyGraphqlApiProps</a>

the properties used to configure the generated api.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addDynamoDbDataSource">addDynamoDbDataSource</a></code> | Add a new DynamoDB data source to this API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addElasticsearchDataSource">addElasticsearchDataSource</a></code> | Add a new elasticsearch data source to this API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addEventBridgeDataSource">addEventBridgeDataSource</a></code> | Add an EventBridge data source to this api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addFunction">addFunction</a></code> | Add an appsync function to the api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addHttpDataSource">addHttpDataSource</a></code> | Add a new http data source to this API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addLambdaDataSource">addLambdaDataSource</a></code> | Add a new Lambda data source to this API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addNoneDataSource">addNoneDataSource</a></code> | Add a new dummy data source to this API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addOpenSearchDataSource">addOpenSearchDataSource</a></code> | dd a new OpenSearch data source to this API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addRdsDataSource">addRdsDataSource</a></code> | Add a new Rds data source to this API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addResolver">addResolver</a></code> | Add a resolver to the api. |

---

##### `toString` <a name="toString" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `addDynamoDbDataSource` <a name="addDynamoDbDataSource" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addDynamoDbDataSource"></a>

```typescript
public addDynamoDbDataSource(id: string, table: ITable, options?: DataSourceOptions): DynamoDbDataSource
```

Add a new DynamoDB data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addDynamoDbDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `table`<sup>Required</sup> <a name="table" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addDynamoDbDataSource.parameter.table"></a>

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

The DynamoDB table backing this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addDynamoDbDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### ~~`addElasticsearchDataSource`~~ <a name="addElasticsearchDataSource" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addElasticsearchDataSource"></a>

```typescript
public addElasticsearchDataSource(id: string, domain: IDomain, options?: DataSourceOptions): ElasticsearchDataSource
```

Add a new elasticsearch data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addElasticsearchDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `domain`<sup>Required</sup> <a name="domain" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addElasticsearchDataSource.parameter.domain"></a>

- *Type:* aws-cdk-lib.aws_elasticsearch.IDomain

The elasticsearch domain for this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addElasticsearchDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addEventBridgeDataSource` <a name="addEventBridgeDataSource" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addEventBridgeDataSource"></a>

```typescript
public addEventBridgeDataSource(id: string, eventBus: IEventBus, options?: DataSourceOptions): EventBridgeDataSource
```

Add an EventBridge data source to this api.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addEventBridgeDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `eventBus`<sup>Required</sup> <a name="eventBus" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addEventBridgeDataSource.parameter.eventBus"></a>

- *Type:* aws-cdk-lib.aws_events.IEventBus

The EventBridge EventBus on which to put events.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addEventBridgeDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addFunction` <a name="addFunction" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addFunction"></a>

```typescript
public addFunction(id: string, props: AddFunctionProps): AppsyncFunction
```

Add an appsync function to the api.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addFunction.parameter.id"></a>

- *Type:* string

the function's id.

---

###### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addFunction.parameter.props"></a>

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.AddFunctionProps">AddFunctionProps</a>

---

##### `addHttpDataSource` <a name="addHttpDataSource" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addHttpDataSource"></a>

```typescript
public addHttpDataSource(id: string, endpoint: string, options?: HttpDataSourceOptions): HttpDataSource
```

Add a new http data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addHttpDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `endpoint`<sup>Required</sup> <a name="endpoint" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addHttpDataSource.parameter.endpoint"></a>

- *Type:* string

The http endpoint.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addHttpDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.HttpDataSourceOptions

The optional configuration for this data source.

---

##### `addLambdaDataSource` <a name="addLambdaDataSource" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addLambdaDataSource"></a>

```typescript
public addLambdaDataSource(id: string, lambdaFunction: IFunction, options?: DataSourceOptions): LambdaDataSource
```

Add a new Lambda data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addLambdaDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `lambdaFunction`<sup>Required</sup> <a name="lambdaFunction" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addLambdaDataSource.parameter.lambdaFunction"></a>

- *Type:* aws-cdk-lib.aws_lambda.IFunction

The Lambda function to call to interact with this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addLambdaDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addNoneDataSource` <a name="addNoneDataSource" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addNoneDataSource"></a>

```typescript
public addNoneDataSource(id: string, options?: DataSourceOptions): NoneDataSource
```

Add a new dummy data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.
Useful for pipeline resolvers and for backend changes that don't require a data source.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addNoneDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addNoneDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addOpenSearchDataSource` <a name="addOpenSearchDataSource" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addOpenSearchDataSource"></a>

```typescript
public addOpenSearchDataSource(id: string, domain: IDomain, options?: DataSourceOptions): OpenSearchDataSource
```

dd a new OpenSearch data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addOpenSearchDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `domain`<sup>Required</sup> <a name="domain" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addOpenSearchDataSource.parameter.domain"></a>

- *Type:* aws-cdk-lib.aws_opensearchservice.IDomain

The OpenSearch domain for this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addOpenSearchDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addRdsDataSource` <a name="addRdsDataSource" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addRdsDataSource"></a>

```typescript
public addRdsDataSource(id: string, serverlessCluster: IServerlessCluster, secretStore: ISecret, databaseName?: string, options?: DataSourceOptions): RdsDataSource
```

Add a new Rds data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addRdsDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `serverlessCluster`<sup>Required</sup> <a name="serverlessCluster" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addRdsDataSource.parameter.serverlessCluster"></a>

- *Type:* aws-cdk-lib.aws_rds.IServerlessCluster

The serverless cluster to interact with this data source.

---

###### `secretStore`<sup>Required</sup> <a name="secretStore" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addRdsDataSource.parameter.secretStore"></a>

- *Type:* aws-cdk-lib.aws_secretsmanager.ISecret

The secret store that contains the username and password for the serverless cluster.

---

###### `databaseName`<sup>Optional</sup> <a name="databaseName" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addRdsDataSource.parameter.databaseName"></a>

- *Type:* string

The optional name of the database to use within the cluster.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addRdsDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addResolver` <a name="addResolver" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addResolver"></a>

```typescript
public addResolver(id: string, props: ExtendedResolverProps): Resolver
```

Add a resolver to the api.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addResolver.parameter.id"></a>

- *Type:* string

The resolver's id.

---

###### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.addResolver.parameter.props"></a>

- *Type:* aws-cdk-lib.aws_appsync.ExtendedResolverProps

the resolver properties.

---

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
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.graphqlUrl">graphqlUrl</a></code> | <code>string</code> | Graphql URL For the generated API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.realtimeUrl">realtimeUrl</a></code> | <code>string</code> | Realtime URL For the generated API. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.resources">resources</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources">AmplifyGraphqlApiResources</a></code> | Generated L1 and L2 CDK resources. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.apiKey">apiKey</a></code> | <code>string</code> | Generated Api Key if generated. |

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

##### `graphqlUrl`<sup>Required</sup> <a name="graphqlUrl" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.graphqlUrl"></a>

```typescript
public readonly graphqlUrl: string;
```

- *Type:* string

Graphql URL For the generated API.

May be a CDK Token.

---

##### `realtimeUrl`<sup>Required</sup> <a name="realtimeUrl" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.realtimeUrl"></a>

```typescript
public readonly realtimeUrl: string;
```

- *Type:* string

Realtime URL For the generated API.

May be a CDK Token.

---

##### `resources`<sup>Required</sup> <a name="resources" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.resources"></a>

```typescript
public readonly resources: AmplifyGraphqlApiResources;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources">AmplifyGraphqlApiResources</a>

Generated L1 and L2 CDK resources.

---

##### `apiKey`<sup>Optional</sup> <a name="apiKey" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApi.property.apiKey"></a>

```typescript
public readonly apiKey: string;
```

- *Type:* string

Generated Api Key if generated.

May be a CDK Token.

---


## Structs <a name="Structs" id="Structs"></a>

### AddFunctionProps <a name="AddFunctionProps" id="@aws-amplify/graphql-construct-alpha.AddFunctionProps"></a>

Input type properties when adding a new appsync.AppsyncFunction to the generated API. This is equivalent to the Omit<appsync.AppsyncFunctionProps, 'api'>.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.AddFunctionProps.Initializer"></a>

```typescript
import { AddFunctionProps } from '@aws-amplify/graphql-construct-alpha'

const addFunctionProps: AddFunctionProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.dataSource">dataSource</a></code> | <code>aws-cdk-lib.aws_appsync.BaseDataSource</code> | the data source linked to this AppSync Function. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.name">name</a></code> | <code>string</code> | the name of the AppSync Function. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.code">code</a></code> | <code>aws-cdk-lib.aws_appsync.Code</code> | The function code. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.description">description</a></code> | <code>string</code> | the description for this AppSync Function. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.requestMappingTemplate">requestMappingTemplate</a></code> | <code>aws-cdk-lib.aws_appsync.MappingTemplate</code> | the request mapping template for the AppSync Function. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.responseMappingTemplate">responseMappingTemplate</a></code> | <code>aws-cdk-lib.aws_appsync.MappingTemplate</code> | the response mapping template for the AppSync Function. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.runtime">runtime</a></code> | <code>aws-cdk-lib.aws_appsync.FunctionRuntime</code> | The functions runtime. |

---

##### `dataSource`<sup>Required</sup> <a name="dataSource" id="@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.dataSource"></a>

```typescript
public readonly dataSource: BaseDataSource;
```

- *Type:* aws-cdk-lib.aws_appsync.BaseDataSource

the data source linked to this AppSync Function.

---

##### `name`<sup>Required</sup> <a name="name" id="@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

the name of the AppSync Function.

---

##### `code`<sup>Optional</sup> <a name="code" id="@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.code"></a>

```typescript
public readonly code: Code;
```

- *Type:* aws-cdk-lib.aws_appsync.Code
- *Default:* no code is used

The function code.

---

##### `description`<sup>Optional</sup> <a name="description" id="@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string
- *Default:* no description

the description for this AppSync Function.

---

##### `requestMappingTemplate`<sup>Optional</sup> <a name="requestMappingTemplate" id="@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.requestMappingTemplate"></a>

```typescript
public readonly requestMappingTemplate: MappingTemplate;
```

- *Type:* aws-cdk-lib.aws_appsync.MappingTemplate
- *Default:* no request mapping template

the request mapping template for the AppSync Function.

---

##### `responseMappingTemplate`<sup>Optional</sup> <a name="responseMappingTemplate" id="@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.responseMappingTemplate"></a>

```typescript
public readonly responseMappingTemplate: MappingTemplate;
```

- *Type:* aws-cdk-lib.aws_appsync.MappingTemplate
- *Default:* no response mapping template

the response mapping template for the AppSync Function.

---

##### `runtime`<sup>Optional</sup> <a name="runtime" id="@aws-amplify/graphql-construct-alpha.AddFunctionProps.property.runtime"></a>

```typescript
public readonly runtime: FunctionRuntime;
```

- *Type:* aws-cdk-lib.aws_appsync.FunctionRuntime
- *Default:* no function runtime, VTL mapping templates used

The functions runtime.

---

### AmplifyGraphqlApiCfnResources <a name="AmplifyGraphqlApiCfnResources" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources"></a>

L1 CDK resources from the Api which were generated as part of the transform.

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
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnGraphqlApi">cfnGraphqlApi</a></code> | <code>aws-cdk-lib.aws_appsync.CfnGraphQLApi</code> | The Generated AppSync Api L1 Resource. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnGraphqlSchema">cfnGraphqlSchema</a></code> | <code>aws-cdk-lib.aws_appsync.CfnGraphQLSchema</code> | The Generated AppSync Schema L1 Resource. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnResolvers">cfnResolvers</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_appsync.CfnResolver}</code> | The Generated AppSync Resolver L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnRoles">cfnRoles</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_iam.CfnRole}</code> | The Generated IAM Role L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnTables">cfnTables</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_dynamodb.CfnTable}</code> | The Generated DynamoDB Table L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiCfnResources.property.cfnApiKey">cfnApiKey</a></code> | <code>aws-cdk-lib.aws_appsync.CfnApiKey</code> | The Generated AppSync Api Key L1 Resource. |

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

The Generated AppSync Api L1 Resource.

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

The Generated AppSync Api Key L1 Resource.

---

### AmplifyGraphqlApiProps <a name="AmplifyGraphqlApiProps" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps"></a>

Input props for the AmplifyGraphqlApi construct.

Specifies what the input to transform into an Api, and configurations for
the transformation process.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.Initializer"></a>

```typescript
import { AmplifyGraphqlApiProps } from '@aws-amplify/graphql-construct-alpha'

const amplifyGraphqlApiProps: AmplifyGraphqlApiProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.authorizationModes">authorizationModes</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationModes">AuthorizationModes</a></code> | Required auth modes for the Api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.definition">definition</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlDefinition">IAmplifyGraphqlDefinition</a></code> | The definition to transform in a full Api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.apiName">apiName</a></code> | <code>string</code> | Name to be used for the AppSync Api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.conflictResolution">conflictResolution</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.ConflictResolution">ConflictResolution</a></code> | Configure conflict resolution on the Api, which is required to enable DataStore Api functionality. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.functionNameMap">functionNameMap</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}</code> | Lambda functions referenced in the definitions's. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.functionSlots">functionSlots</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]</code> | Overrides for a given slot in the generated resolver pipelines. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.outputStorageStrategy">outputStorageStrategy</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy">IBackendOutputStorageStrategy</a></code> | Strategy to store construct outputs. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.predictionsBucket">predictionsBucket</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | If using predictions, a bucket must be provided which will be used to search for assets. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.stackMappings">stackMappings</a></code> | <code>{[ key: string ]: string}</code> | StackMappings override the assigned nested stack on a per-resource basis. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.transformers">transformers</a></code> | <code>any[]</code> | Provide a list of additional custom transformers which are injected into the transform process. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.translationBehavior">translationBehavior</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior">PartialTranslationBehavior</a></code> | This replaces feature flags from the Api construct, for general information on what these parameters do, refer to https://docs.amplify.aws/cli/reference/feature-flags/#graphQLTransformer. |

---

##### `authorizationModes`<sup>Required</sup> <a name="authorizationModes" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.authorizationModes"></a>

```typescript
public readonly authorizationModes: AuthorizationModes;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.AuthorizationModes">AuthorizationModes</a>

Required auth modes for the Api.

This object must be a superset of the configured auth providers in the Api definition.
For more information, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/

---

##### `definition`<sup>Required</sup> <a name="definition" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.definition"></a>

```typescript
public readonly definition: IAmplifyGraphqlDefinition;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlDefinition">IAmplifyGraphqlDefinition</a>

The definition to transform in a full Api.

---

##### `apiName`<sup>Optional</sup> <a name="apiName" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.apiName"></a>

```typescript
public readonly apiName: string;
```

- *Type:* string

Name to be used for the AppSync Api.

Default: construct id.

---

##### `conflictResolution`<sup>Optional</sup> <a name="conflictResolution" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.conflictResolution"></a>

```typescript
public readonly conflictResolution: ConflictResolution;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.ConflictResolution">ConflictResolution</a>

Configure conflict resolution on the Api, which is required to enable DataStore Api functionality.

For more information, refer to https://docs.amplify.aws/lib/datastore/getting-started/q/platform/js/

---

##### `functionNameMap`<sup>Optional</sup> <a name="functionNameMap" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.functionNameMap"></a>

```typescript
public readonly functionNameMap: {[ key: string ]: IFunction};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}

Lambda functions referenced in the definitions's.

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

##### `translationBehavior`<sup>Optional</sup> <a name="translationBehavior" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiProps.property.translationBehavior"></a>

```typescript
public readonly translationBehavior: PartialTranslationBehavior;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior">PartialTranslationBehavior</a>

This replaces feature flags from the Api construct, for general information on what these parameters do, refer to https://docs.amplify.aws/cli/reference/feature-flags/#graphQLTransformer.

---

### AmplifyGraphqlApiResources <a name="AmplifyGraphqlApiResources" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources"></a>

Accessible resources from the Api which were generated as part of the transform.

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
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.graphqlApi">graphqlApi</a></code> | <code>aws-cdk-lib.aws_appsync.IGraphqlApi</code> | The Generated AppSync Api L2 Resource, includes the Schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.nestedStacks">nestedStacks</a></code> | <code>{[ key: string ]: aws-cdk-lib.NestedStack}</code> | Nested Stacks generated by the Api Construct. |
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

The Generated AppSync Api L2 Resource, includes the Schema.

---

##### `nestedStacks`<sup>Required</sup> <a name="nestedStacks" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlApiResources.property.nestedStacks"></a>

```typescript
public readonly nestedStacks: {[ key: string ]: NestedStack};
```

- *Type:* {[ key: string ]: aws-cdk-lib.NestedStack}

Nested Stacks generated by the Api Construct.

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

Configuration for Api Keys on the Graphql Api.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig.Initializer"></a>

```typescript
import { ApiKeyAuthorizationConfig } from '@aws-amplify/graphql-construct-alpha'

const apiKeyAuthorizationConfig: ApiKeyAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig.property.expires">expires</a></code> | <code>aws-cdk-lib.Duration</code> | A duration representing the time from Cloudformation deploy until expiry. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig.property.description">description</a></code> | <code>string</code> | Optional description for the Api Key to attach to the Api. |

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

Optional description for the Api Key to attach to the Api.

---

### AuthorizationModes <a name="AuthorizationModes" id="@aws-amplify/graphql-construct-alpha.AuthorizationModes"></a>

Authorization Modes to apply to the Api.

At least one modes must be provided, and if more than one are provided a defaultAuthorizationMode must be specified.
For more information on Amplify Api auth, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/#authorization-strategies

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.AuthorizationModes.Initializer"></a>

```typescript
import { AuthorizationModes } from '@aws-amplify/graphql-construct-alpha'

const authorizationModes: AuthorizationModes = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.adminRoles">adminRoles</a></code> | <code>aws-cdk-lib.aws_iam.IRole[]</code> | A list of roles granted full R/W access to the Api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.apiKeyConfig">apiKeyConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig">ApiKeyAuthorizationConfig</a></code> | AppSync Api Key config, required if a 'apiKey' auth provider is specified in the Api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.defaultAuthorizationMode">defaultAuthorizationMode</a></code> | <code>string</code> | Default auth mode to provide to the Api, required if more than one config type is specified. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.iamConfig">iamConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig">IAMAuthorizationConfig</a></code> | IAM Auth config, required if an 'iam' auth provider is specified in the Api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.lambdaConfig">lambdaConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig">LambdaAuthorizationConfig</a></code> | Lambda config, required if a 'function' auth provider is specified in the Api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.oidcConfig">oidcConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig">OIDCAuthorizationConfig</a></code> | Cognito OIDC config, required if a 'oidc' auth provider is specified in the Api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.userPoolConfig">userPoolConfig</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.UserPoolAuthorizationConfig">UserPoolAuthorizationConfig</a></code> | Cognito UserPool config, required if a 'userPools' auth provider is specified in the Api. |

---

##### `adminRoles`<sup>Optional</sup> <a name="adminRoles" id="@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.adminRoles"></a>

```typescript
public readonly adminRoles: IRole[];
```

- *Type:* aws-cdk-lib.aws_iam.IRole[]

A list of roles granted full R/W access to the Api.

---

##### `apiKeyConfig`<sup>Optional</sup> <a name="apiKeyConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.apiKeyConfig"></a>

```typescript
public readonly apiKeyConfig: ApiKeyAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.ApiKeyAuthorizationConfig">ApiKeyAuthorizationConfig</a>

AppSync Api Key config, required if a 'apiKey' auth provider is specified in the Api.

Applies to 'public' auth strategy.

---

##### `defaultAuthorizationMode`<sup>Optional</sup> <a name="defaultAuthorizationMode" id="@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.defaultAuthorizationMode"></a>

```typescript
public readonly defaultAuthorizationMode: string;
```

- *Type:* string

Default auth mode to provide to the Api, required if more than one config type is specified.

---

##### `iamConfig`<sup>Optional</sup> <a name="iamConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.iamConfig"></a>

```typescript
public readonly iamConfig: IAMAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig">IAMAuthorizationConfig</a>

IAM Auth config, required if an 'iam' auth provider is specified in the Api.

Applies to 'public' and 'private' auth strategies.

---

##### `lambdaConfig`<sup>Optional</sup> <a name="lambdaConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.lambdaConfig"></a>

```typescript
public readonly lambdaConfig: LambdaAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig">LambdaAuthorizationConfig</a>

Lambda config, required if a 'function' auth provider is specified in the Api.

Applies to 'custom' auth strategy.

---

##### `oidcConfig`<sup>Optional</sup> <a name="oidcConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.oidcConfig"></a>

```typescript
public readonly oidcConfig: OIDCAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig">OIDCAuthorizationConfig</a>

Cognito OIDC config, required if a 'oidc' auth provider is specified in the Api.

Applies to 'owner', 'private', and 'group' auth strategies.

---

##### `userPoolConfig`<sup>Optional</sup> <a name="userPoolConfig" id="@aws-amplify/graphql-construct-alpha.AuthorizationModes.property.userPoolConfig"></a>

```typescript
public readonly userPoolConfig: UserPoolAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.UserPoolAuthorizationConfig">UserPoolAuthorizationConfig</a>

Cognito UserPool config, required if a 'userPools' auth provider is specified in the Api.

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
| <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotBase.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the Api definition. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotBase.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotBase.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-construct-alpha.FunctionSlotBase.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the Api definition.

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

Configuration for IAM Authorization on the Graphql Api.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.Initializer"></a>

```typescript
import { IAMAuthorizationConfig } from '@aws-amplify/graphql-construct-alpha'

const iAMAuthorizationConfig: IAMAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.authenticatedUserRole">authenticatedUserRole</a></code> | <code>aws-cdk-lib.aws_iam.IRole</code> | Authenticated user role, applies to { provider: iam, allow: private } access. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.identityPoolId">identityPoolId</a></code> | <code>string</code> | ID for the Cognito Identity Pool vending auth and unauth roles. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.unauthenticatedUserRole">unauthenticatedUserRole</a></code> | <code>aws-cdk-lib.aws_iam.IRole</code> | Unauthenticated user role, applies to { provider: iam, allow: public } access. |

---

##### `authenticatedUserRole`<sup>Required</sup> <a name="authenticatedUserRole" id="@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.authenticatedUserRole"></a>

```typescript
public readonly authenticatedUserRole: IRole;
```

- *Type:* aws-cdk-lib.aws_iam.IRole

Authenticated user role, applies to { provider: iam, allow: private } access.

---

##### `identityPoolId`<sup>Required</sup> <a name="identityPoolId" id="@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.identityPoolId"></a>

```typescript
public readonly identityPoolId: string;
```

- *Type:* string

ID for the Cognito Identity Pool vending auth and unauth roles.

---

##### `unauthenticatedUserRole`<sup>Required</sup> <a name="unauthenticatedUserRole" id="@aws-amplify/graphql-construct-alpha.IAMAuthorizationConfig.property.unauthenticatedUserRole"></a>

```typescript
public readonly unauthenticatedUserRole: IRole;
```

- *Type:* aws-cdk-lib.aws_iam.IRole

Unauthenticated user role, applies to { provider: iam, allow: public } access.

---

### LambdaAuthorizationConfig <a name="LambdaAuthorizationConfig" id="@aws-amplify/graphql-construct-alpha.LambdaAuthorizationConfig"></a>

Configuration for Custom Lambda authorization on the Graphql Api.

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
| <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the Api definition. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.slotName">slotName</a></code> | <code>string</code> | The slot name to inject this behavior into. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.typeName">typeName</a></code> | <code>string</code> | This slot type applies to the Mutation type on the Api definition. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-construct-alpha.MutationFunctionSlot.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the Api definition.

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

This slot type applies to the Mutation type on the Api definition.

---

### OIDCAuthorizationConfig <a name="OIDCAuthorizationConfig" id="@aws-amplify/graphql-construct-alpha.OIDCAuthorizationConfig"></a>

Configuration for OpenId Connect Authorization on the Graphql Api.

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

### PartialTranslationBehavior <a name="PartialTranslationBehavior" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior"></a>

A utility interface equivalent to Partial<TranslationBehavior>.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.Initializer"></a>

```typescript
import { PartialTranslationBehavior } from '@aws-amplify/graphql-construct-alpha'

const partialTranslationBehavior: PartialTranslationBehavior = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.disableResolverDeduping">disableResolverDeduping</a></code> | <code>boolean</code> | Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.enableAutoIndexQueryNames">enableAutoIndexQueryNames</a></code> | <code>boolean</code> | Automate generation of query names, and as a result attaching all indexes as queries to the generated Api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.enableSearchNodeToNodeEncryption">enableSearchNodeToNodeEncryption</a></code> | <code>boolean</code> | If enabled, set nodeToNodeEncryption on the searchable domain (if one exists). |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.enableTransformerCfnOutputs">enableTransformerCfnOutputs</a></code> | <code>boolean</code> | When enabled, internal cfn outputs which existed in Amplify-generated apps will continue to be emitted. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.populateOwnerFieldForStaticGroupAuth">populateOwnerFieldForStaticGroupAuth</a></code> | <code>boolean</code> | Ensure that the owner field is still populated even if a static iam or group authorization applies. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField">respectPrimaryKeyAttributesOnConnectionField</a></code> | <code>boolean</code> | Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.sandboxModeEnabled">sandboxModeEnabled</a></code> | <code>boolean</code> | Enabling sandbox mode will enable api key auth on all models in the transformed schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.secondaryKeyAsGSI">secondaryKeyAsGSI</a></code> | <code>boolean</code> | If disabled, generated. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults">shouldDeepMergeDirectiveConfigDefaults</a></code> | <code>boolean</code> | Restore parity w/ GQLv1. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.suppressApiKeyGeneration">suppressApiKeyGeneration</a></code> | <code>boolean</code> | If enabled, disable api key resource generation even if specified as an auth rule on the construct. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.useSubUsernameForDefaultIdentityClaim">useSubUsernameForDefaultIdentityClaim</a></code> | <code>boolean</code> | Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool. |

---

##### `disableResolverDeduping`<sup>Optional</sup> <a name="disableResolverDeduping" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.disableResolverDeduping"></a>

```typescript
public readonly disableResolverDeduping: boolean;
```

- *Type:* boolean
- *Default:* true

Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered.

---

##### `enableAutoIndexQueryNames`<sup>Optional</sup> <a name="enableAutoIndexQueryNames" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.enableAutoIndexQueryNames"></a>

```typescript
public readonly enableAutoIndexQueryNames: boolean;
```

- *Type:* boolean
- *Default:* true

Automate generation of query names, and as a result attaching all indexes as queries to the generated Api.

If enabled,

---

##### `enableSearchNodeToNodeEncryption`<sup>Optional</sup> <a name="enableSearchNodeToNodeEncryption" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.enableSearchNodeToNodeEncryption"></a>

```typescript
public readonly enableSearchNodeToNodeEncryption: boolean;
```

- *Type:* boolean
- *Default:* false

If enabled, set nodeToNodeEncryption on the searchable domain (if one exists).

Not recommended for use, prefer
to use `Object.values(resources.additionalResources['AWS::Elasticsearch::Domain']).forEach((domain: CfnDomain) => {
  domain.NodeToNodeEncryptionOptions = { Enabled: True };
});

---

##### `enableTransformerCfnOutputs`<sup>Optional</sup> <a name="enableTransformerCfnOutputs" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.enableTransformerCfnOutputs"></a>

```typescript
public readonly enableTransformerCfnOutputs: boolean;
```

- *Type:* boolean
- *Default:* false

When enabled, internal cfn outputs which existed in Amplify-generated apps will continue to be emitted.

---

##### `populateOwnerFieldForStaticGroupAuth`<sup>Optional</sup> <a name="populateOwnerFieldForStaticGroupAuth" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.populateOwnerFieldForStaticGroupAuth"></a>

```typescript
public readonly populateOwnerFieldForStaticGroupAuth: boolean;
```

- *Type:* boolean
- *Default:* true

Ensure that the owner field is still populated even if a static iam or group authorization applies.

---

##### `respectPrimaryKeyAttributesOnConnectionField`<sup>Optional</sup> <a name="respectPrimaryKeyAttributesOnConnectionField" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField"></a>

```typescript
public readonly respectPrimaryKeyAttributesOnConnectionField: boolean;
```

- *Type:* boolean
- *Default:* true

Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.

---

##### `sandboxModeEnabled`<sup>Optional</sup> <a name="sandboxModeEnabled" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.sandboxModeEnabled"></a>

```typescript
public readonly sandboxModeEnabled: boolean;
```

- *Type:* boolean
- *Default:* false

Enabling sandbox mode will enable api key auth on all models in the transformed schema.

---

##### `secondaryKeyAsGSI`<sup>Optional</sup> <a name="secondaryKeyAsGSI" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.secondaryKeyAsGSI"></a>

```typescript
public readonly secondaryKeyAsGSI: boolean;
```

- *Type:* boolean
- *Default:* true

If disabled, generated.

---

##### `shouldDeepMergeDirectiveConfigDefaults`<sup>Optional</sup> <a name="shouldDeepMergeDirectiveConfigDefaults" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults"></a>

```typescript
public readonly shouldDeepMergeDirectiveConfigDefaults: boolean;
```

- *Type:* boolean
- *Default:* true

Restore parity w/ GQLv1.

---

##### `suppressApiKeyGeneration`<sup>Optional</sup> <a name="suppressApiKeyGeneration" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.suppressApiKeyGeneration"></a>

```typescript
public readonly suppressApiKeyGeneration: boolean;
```

- *Type:* boolean
- *Default:* false

If enabled, disable api key resource generation even if specified as an auth rule on the construct.

This is a legacy parameter from the Graphql Transformer existing in Amplify CLI, not recommended to change.

---

##### `useSubUsernameForDefaultIdentityClaim`<sup>Optional</sup> <a name="useSubUsernameForDefaultIdentityClaim" id="@aws-amplify/graphql-construct-alpha.PartialTranslationBehavior.property.useSubUsernameForDefaultIdentityClaim"></a>

```typescript
public readonly useSubUsernameForDefaultIdentityClaim: boolean;
```

- *Type:* boolean
- *Default:* true

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
| <code><a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the Api definition. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.slotName">slotName</a></code> | <code>string</code> | The slot name to inject this behavior into. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.typeName">typeName</a></code> | <code>string</code> | This slot type applies to the Query type on the Api definition. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-construct-alpha.QueryFunctionSlot.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the Api definition.

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

This slot type applies to the Query type on the Api definition.

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
| <code><a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the Api definition. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.slotName">slotName</a></code> | <code>string</code> | The slot name to inject this behavior into. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.typeName">typeName</a></code> | <code>string</code> | This slot type applies to the Subscription type on the Api definition. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the Api definition.

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

This slot type applies to the Subscription type on the Api definition.

---

### TranslationBehavior <a name="TranslationBehavior" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior"></a>

Strongly typed set of shared parameters for all transformers, and core layer.

This is intended to replace feature flags, to ensure param coercion happens in
a single location, and isn't spread around the transformers, where they can
have different default behaviors.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.Initializer"></a>

```typescript
import { TranslationBehavior } from '@aws-amplify/graphql-construct-alpha'

const translationBehavior: TranslationBehavior = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.disableResolverDeduping">disableResolverDeduping</a></code> | <code>boolean</code> | Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.enableAutoIndexQueryNames">enableAutoIndexQueryNames</a></code> | <code>boolean</code> | Automate generation of query names, and as a result attaching all indexes as queries to the generated Api. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.enableSearchNodeToNodeEncryption">enableSearchNodeToNodeEncryption</a></code> | <code>boolean</code> | If enabled, set nodeToNodeEncryption on the searchable domain (if one exists). |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.enableTransformerCfnOutputs">enableTransformerCfnOutputs</a></code> | <code>boolean</code> | When enabled, internal cfn outputs which existed in Amplify-generated apps will continue to be emitted. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.populateOwnerFieldForStaticGroupAuth">populateOwnerFieldForStaticGroupAuth</a></code> | <code>boolean</code> | Ensure that the owner field is still populated even if a static iam or group authorization applies. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField">respectPrimaryKeyAttributesOnConnectionField</a></code> | <code>boolean</code> | Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.sandboxModeEnabled">sandboxModeEnabled</a></code> | <code>boolean</code> | Enabling sandbox mode will enable api key auth on all models in the transformed schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.secondaryKeyAsGSI">secondaryKeyAsGSI</a></code> | <code>boolean</code> | If disabled, generated. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults">shouldDeepMergeDirectiveConfigDefaults</a></code> | <code>boolean</code> | Restore parity w/ GQLv1. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.suppressApiKeyGeneration">suppressApiKeyGeneration</a></code> | <code>boolean</code> | If enabled, disable api key resource generation even if specified as an auth rule on the construct. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.useSubUsernameForDefaultIdentityClaim">useSubUsernameForDefaultIdentityClaim</a></code> | <code>boolean</code> | Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool. |

---

##### `disableResolverDeduping`<sup>Required</sup> <a name="disableResolverDeduping" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.disableResolverDeduping"></a>

```typescript
public readonly disableResolverDeduping: boolean;
```

- *Type:* boolean
- *Default:* true

Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered.

---

##### `enableAutoIndexQueryNames`<sup>Required</sup> <a name="enableAutoIndexQueryNames" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.enableAutoIndexQueryNames"></a>

```typescript
public readonly enableAutoIndexQueryNames: boolean;
```

- *Type:* boolean
- *Default:* true

Automate generation of query names, and as a result attaching all indexes as queries to the generated Api.

If enabled,

---

##### `enableSearchNodeToNodeEncryption`<sup>Required</sup> <a name="enableSearchNodeToNodeEncryption" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.enableSearchNodeToNodeEncryption"></a>

```typescript
public readonly enableSearchNodeToNodeEncryption: boolean;
```

- *Type:* boolean
- *Default:* false

If enabled, set nodeToNodeEncryption on the searchable domain (if one exists).

Not recommended for use, prefer
to use `Object.values(resources.additionalResources['AWS::Elasticsearch::Domain']).forEach((domain: CfnDomain) => {
  domain.NodeToNodeEncryptionOptions = { Enabled: True };
});

---

##### `enableTransformerCfnOutputs`<sup>Required</sup> <a name="enableTransformerCfnOutputs" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.enableTransformerCfnOutputs"></a>

```typescript
public readonly enableTransformerCfnOutputs: boolean;
```

- *Type:* boolean
- *Default:* false

When enabled, internal cfn outputs which existed in Amplify-generated apps will continue to be emitted.

---

##### `populateOwnerFieldForStaticGroupAuth`<sup>Required</sup> <a name="populateOwnerFieldForStaticGroupAuth" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.populateOwnerFieldForStaticGroupAuth"></a>

```typescript
public readonly populateOwnerFieldForStaticGroupAuth: boolean;
```

- *Type:* boolean
- *Default:* true

Ensure that the owner field is still populated even if a static iam or group authorization applies.

---

##### `respectPrimaryKeyAttributesOnConnectionField`<sup>Required</sup> <a name="respectPrimaryKeyAttributesOnConnectionField" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField"></a>

```typescript
public readonly respectPrimaryKeyAttributesOnConnectionField: boolean;
```

- *Type:* boolean
- *Default:* true

Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.

---

##### `sandboxModeEnabled`<sup>Required</sup> <a name="sandboxModeEnabled" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.sandboxModeEnabled"></a>

```typescript
public readonly sandboxModeEnabled: boolean;
```

- *Type:* boolean
- *Default:* false

Enabling sandbox mode will enable api key auth on all models in the transformed schema.

---

##### `secondaryKeyAsGSI`<sup>Required</sup> <a name="secondaryKeyAsGSI" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.secondaryKeyAsGSI"></a>

```typescript
public readonly secondaryKeyAsGSI: boolean;
```

- *Type:* boolean
- *Default:* true

If disabled, generated.

---

##### `shouldDeepMergeDirectiveConfigDefaults`<sup>Required</sup> <a name="shouldDeepMergeDirectiveConfigDefaults" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults"></a>

```typescript
public readonly shouldDeepMergeDirectiveConfigDefaults: boolean;
```

- *Type:* boolean
- *Default:* true

Restore parity w/ GQLv1.

---

##### `suppressApiKeyGeneration`<sup>Required</sup> <a name="suppressApiKeyGeneration" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.suppressApiKeyGeneration"></a>

```typescript
public readonly suppressApiKeyGeneration: boolean;
```

- *Type:* boolean
- *Default:* false

If enabled, disable api key resource generation even if specified as an auth rule on the construct.

This is a legacy parameter from the Graphql Transformer existing in Amplify CLI, not recommended to change.

---

##### `useSubUsernameForDefaultIdentityClaim`<sup>Required</sup> <a name="useSubUsernameForDefaultIdentityClaim" id="@aws-amplify/graphql-construct-alpha.TranslationBehavior.property.useSubUsernameForDefaultIdentityClaim"></a>

```typescript
public readonly useSubUsernameForDefaultIdentityClaim: boolean;
```

- *Type:* boolean
- *Default:* true

Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool.

---

### UserPoolAuthorizationConfig <a name="UserPoolAuthorizationConfig" id="@aws-amplify/graphql-construct-alpha.UserPoolAuthorizationConfig"></a>

Configuration for Cognito UserPool Authorization on the Graphql Api.

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

### AmplifyGraphqlDefinition <a name="AmplifyGraphqlDefinition" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlDefinition"></a>

Class exposing utilities to produce IAmplifyGraphqlDefinition objects given various inputs.

#### Initializers <a name="Initializers" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlDefinition.Initializer"></a>

```typescript
import { AmplifyGraphqlDefinition } from '@aws-amplify/graphql-construct-alpha'

new AmplifyGraphqlDefinition()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlDefinition.fromFiles">fromFiles</a></code> | Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.AmplifyGraphqlDefinition.fromString">fromString</a></code> | Produce a schema definition from a string input. |

---

##### `fromFiles` <a name="fromFiles" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlDefinition.fromFiles"></a>

```typescript
import { AmplifyGraphqlDefinition } from '@aws-amplify/graphql-construct-alpha'

AmplifyGraphqlDefinition.fromFiles(filePaths: string)
```

Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema.

###### `filePaths`<sup>Required</sup> <a name="filePaths" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlDefinition.fromFiles.parameter.filePaths"></a>

- *Type:* string

one or more paths to the graphql files to process.

---

##### `fromString` <a name="fromString" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlDefinition.fromString"></a>

```typescript
import { AmplifyGraphqlDefinition } from '@aws-amplify/graphql-construct-alpha'

AmplifyGraphqlDefinition.fromString(schema: string)
```

Produce a schema definition from a string input.

###### `schema`<sup>Required</sup> <a name="schema" id="@aws-amplify/graphql-construct-alpha.AmplifyGraphqlDefinition.fromString.parameter.schema"></a>

- *Type:* string

the graphql input as a string.

---



## Protocols <a name="Protocols" id="Protocols"></a>

### IAmplifyGraphqlDefinition <a name="IAmplifyGraphqlDefinition" id="@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlDefinition"></a>

- *Implemented By:* <a href="#@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlDefinition">IAmplifyGraphqlDefinition</a>

Graphql Api definition, which can be implemented in multiple ways.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlDefinition.property.functionSlots">functionSlots</a></code> | <code><a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> \| <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]</code> | Retrieve any function slots defined explicitly in the Api definition. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlDefinition.property.schema">schema</a></code> | <code>string</code> | Return the schema definition as a graphql string, with amplify directives allowed. |

---

##### `functionSlots`<sup>Required</sup> <a name="functionSlots" id="@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlDefinition.property.functionSlots"></a>

```typescript
public readonly functionSlots: MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot[];
```

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.MutationFunctionSlot">MutationFunctionSlot</a> | <a href="#@aws-amplify/graphql-construct-alpha.QueryFunctionSlot">QueryFunctionSlot</a> | <a href="#@aws-amplify/graphql-construct-alpha.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]

Retrieve any function slots defined explicitly in the Api definition.

---

##### `schema`<sup>Required</sup> <a name="schema" id="@aws-amplify/graphql-construct-alpha.IAmplifyGraphqlDefinition.property.schema"></a>

```typescript
public readonly schema: string;
```

- *Type:* string

Return the schema definition as a graphql string, with amplify directives allowed.

---

### IBackendOutputEntry <a name="IBackendOutputEntry" id="@aws-amplify/graphql-construct-alpha.IBackendOutputEntry"></a>

- *Implemented By:* <a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputEntry">IBackendOutputEntry</a>

Entry representing the required output from the backend for codegen generate commands to work.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputEntry.property.payload">payload</a></code> | <code>{[ key: string ]: string}</code> | The string-map payload of generated config values. |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputEntry.property.version">version</a></code> | <code>string</code> | The protocol version for this backend output. |

---

##### `payload`<sup>Required</sup> <a name="payload" id="@aws-amplify/graphql-construct-alpha.IBackendOutputEntry.property.payload"></a>

```typescript
public readonly payload: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}

The string-map payload of generated config values.

---

##### `version`<sup>Required</sup> <a name="version" id="@aws-amplify/graphql-construct-alpha.IBackendOutputEntry.property.version"></a>

```typescript
public readonly version: string;
```

- *Type:* string

The protocol version for this backend output.

---

### IBackendOutputStorageStrategy <a name="IBackendOutputStorageStrategy" id="@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy"></a>

- *Implemented By:* <a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy">IBackendOutputStorageStrategy</a>

Backend output strategy used to write config required for codegen tasks.

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy.addBackendOutputEntry">addBackendOutputEntry</a></code> | Add an entry to backend output. |

---

##### `addBackendOutputEntry` <a name="addBackendOutputEntry" id="@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy.addBackendOutputEntry"></a>

```typescript
public addBackendOutputEntry(keyName: string, backendOutputEntry: IBackendOutputEntry): void
```

Add an entry to backend output.

###### `keyName`<sup>Required</sup> <a name="keyName" id="@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy.addBackendOutputEntry.parameter.keyName"></a>

- *Type:* string

the key.

---

###### `backendOutputEntry`<sup>Required</sup> <a name="backendOutputEntry" id="@aws-amplify/graphql-construct-alpha.IBackendOutputStorageStrategy.addBackendOutputEntry.parameter.backendOutputEntry"></a>

- *Type:* <a href="#@aws-amplify/graphql-construct-alpha.IBackendOutputEntry">IBackendOutputEntry</a>

the record to store in the backend output.

---


