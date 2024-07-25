# Amplify Graphql API Construct

[![View on Construct Hub](https://constructs.dev/badge?package=%40aws-amplify%2Fgraphql-api-construct)](https://constructs.dev/packages/@aws-amplify/graphql-api-construct)

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
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

const app = new App();
const stack = new Stack(app, 'TodoStack');

new AmplifyGraphqlApi(stack, 'TodoApp', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
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
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

const app = new App();
const stack = new Stack(app, 'BlogStack');

new AmplifyGraphqlApi(stack, 'BlogApp', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
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

### Import GraphQL Schema from files, instead of inline

In this example, we import the schema definition itself from one or more local files, rather than an inline graphql string.

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
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

const app = new App();
const stack = new Stack(app, 'MultiFileStack');

new AmplifyGraphqlApi(stack, 'MultiFileDefinition', {
  definition: AmplifyGraphqlDefinition.fromFiles(path.join(__dirname, 'todo.graphql'), path.join(__dirname, 'blog.graphql')),
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

### AmplifyGraphqlApi <a name="AmplifyGraphqlApi" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi"></a>

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

The output of this construct is a mapping of L2 or L1 resources generated by the transformer, which generally follow the access pattern

```typescript
  const api = new AmplifyGraphQlApi(this, 'api', { <params> });
  // Access L2 resources under `.resources`
  api.resources.tables["Todo"].tableArn;

  // Access L1 resources under `.resources.cfnResources`
  api.resources.cfnResources.cfnGraphqlApi.xrayEnabled = true;
  Object.values(api.resources.cfnResources.cfnTables).forEach(table => {
    table.pointInTimeRecoverySpecification = { pointInTimeRecoveryEnabled: false };
  });
```
`resources.<ResourceType>.<ResourceName>` - you can then perform any CDK action on these resulting resoureces.

#### Initializers <a name="Initializers" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.Initializer"></a>

```typescript
import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct'

new AmplifyGraphqlApi(scope: Construct, id: string, props: AmplifyGraphqlApiProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | the scope to create this construct within. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.Initializer.parameter.id">id</a></code> | <code>string</code> | the id to use for this api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.Initializer.parameter.props">props</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps">AmplifyGraphqlApiProps</a></code> | the properties used to configure the generated api. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

the scope to create this construct within.

---

##### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.Initializer.parameter.id"></a>

- *Type:* string

the id to use for this api.

---

##### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.Initializer.parameter.props"></a>

- *Type:* <a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps">AmplifyGraphqlApiProps</a>

the properties used to configure the generated api.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addDynamoDbDataSource">addDynamoDbDataSource</a></code> | Add a new DynamoDB data source to this API. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addElasticsearchDataSource">addElasticsearchDataSource</a></code> | Add a new elasticsearch data source to this API. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addEventBridgeDataSource">addEventBridgeDataSource</a></code> | Add an EventBridge data source to this api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addFunction">addFunction</a></code> | Add an appsync function to the api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addHttpDataSource">addHttpDataSource</a></code> | Add a new http data source to this API. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addLambdaDataSource">addLambdaDataSource</a></code> | Add a new Lambda data source to this API. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addNoneDataSource">addNoneDataSource</a></code> | Add a new dummy data source to this API. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addOpenSearchDataSource">addOpenSearchDataSource</a></code> | dd a new OpenSearch data source to this API. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addRdsDataSource">addRdsDataSource</a></code> | Add a new Rds data source to this API. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addResolver">addResolver</a></code> | Add a resolver to the api. |

---

##### `toString` <a name="toString" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `addDynamoDbDataSource` <a name="addDynamoDbDataSource" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addDynamoDbDataSource"></a>

```typescript
public addDynamoDbDataSource(id: string, table: ITable, options?: DataSourceOptions): DynamoDbDataSource
```

Add a new DynamoDB data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addDynamoDbDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `table`<sup>Required</sup> <a name="table" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addDynamoDbDataSource.parameter.table"></a>

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

The DynamoDB table backing this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addDynamoDbDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### ~~`addElasticsearchDataSource`~~ <a name="addElasticsearchDataSource" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addElasticsearchDataSource"></a>

```typescript
public addElasticsearchDataSource(id: string, domain: IDomain, options?: DataSourceOptions): ElasticsearchDataSource
```

Add a new elasticsearch data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addElasticsearchDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `domain`<sup>Required</sup> <a name="domain" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addElasticsearchDataSource.parameter.domain"></a>

- *Type:* aws-cdk-lib.aws_elasticsearch.IDomain

The elasticsearch domain for this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addElasticsearchDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addEventBridgeDataSource` <a name="addEventBridgeDataSource" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addEventBridgeDataSource"></a>

```typescript
public addEventBridgeDataSource(id: string, eventBus: IEventBus, options?: DataSourceOptions): EventBridgeDataSource
```

Add an EventBridge data source to this api.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addEventBridgeDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `eventBus`<sup>Required</sup> <a name="eventBus" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addEventBridgeDataSource.parameter.eventBus"></a>

- *Type:* aws-cdk-lib.aws_events.IEventBus

The EventBridge EventBus on which to put events.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addEventBridgeDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addFunction` <a name="addFunction" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addFunction"></a>

```typescript
public addFunction(id: string, props: AddFunctionProps): AppsyncFunction
```

Add an appsync function to the api.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addFunction.parameter.id"></a>

- *Type:* string

the function's id.

---

###### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addFunction.parameter.props"></a>

- *Type:* <a href="#@aws-amplify/graphql-api-construct.AddFunctionProps">AddFunctionProps</a>

---

##### `addHttpDataSource` <a name="addHttpDataSource" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addHttpDataSource"></a>

```typescript
public addHttpDataSource(id: string, endpoint: string, options?: HttpDataSourceOptions): HttpDataSource
```

Add a new http data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addHttpDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `endpoint`<sup>Required</sup> <a name="endpoint" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addHttpDataSource.parameter.endpoint"></a>

- *Type:* string

The http endpoint.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addHttpDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.HttpDataSourceOptions

The optional configuration for this data source.

---

##### `addLambdaDataSource` <a name="addLambdaDataSource" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addLambdaDataSource"></a>

```typescript
public addLambdaDataSource(id: string, lambdaFunction: IFunction, options?: DataSourceOptions): LambdaDataSource
```

Add a new Lambda data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addLambdaDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `lambdaFunction`<sup>Required</sup> <a name="lambdaFunction" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addLambdaDataSource.parameter.lambdaFunction"></a>

- *Type:* aws-cdk-lib.aws_lambda.IFunction

The Lambda function to call to interact with this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addLambdaDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addNoneDataSource` <a name="addNoneDataSource" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addNoneDataSource"></a>

```typescript
public addNoneDataSource(id: string, options?: DataSourceOptions): NoneDataSource
```

Add a new dummy data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.
Useful for pipeline resolvers and for backend changes that don't require a data source.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addNoneDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addNoneDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addOpenSearchDataSource` <a name="addOpenSearchDataSource" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addOpenSearchDataSource"></a>

```typescript
public addOpenSearchDataSource(id: string, domain: IDomain, options?: DataSourceOptions): OpenSearchDataSource
```

dd a new OpenSearch data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addOpenSearchDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `domain`<sup>Required</sup> <a name="domain" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addOpenSearchDataSource.parameter.domain"></a>

- *Type:* aws-cdk-lib.aws_opensearchservice.IDomain

The OpenSearch domain for this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addOpenSearchDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addRdsDataSource` <a name="addRdsDataSource" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addRdsDataSource"></a>

```typescript
public addRdsDataSource(id: string, serverlessCluster: IServerlessCluster, secretStore: ISecret, databaseName?: string, options?: DataSourceOptions): RdsDataSource
```

Add a new Rds data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addRdsDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `serverlessCluster`<sup>Required</sup> <a name="serverlessCluster" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addRdsDataSource.parameter.serverlessCluster"></a>

- *Type:* aws-cdk-lib.aws_rds.IServerlessCluster

The serverless cluster to interact with this data source.

---

###### `secretStore`<sup>Required</sup> <a name="secretStore" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addRdsDataSource.parameter.secretStore"></a>

- *Type:* aws-cdk-lib.aws_secretsmanager.ISecret

The secret store that contains the username and password for the serverless cluster.

---

###### `databaseName`<sup>Optional</sup> <a name="databaseName" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addRdsDataSource.parameter.databaseName"></a>

- *Type:* string

The optional name of the database to use within the cluster.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addRdsDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addResolver` <a name="addResolver" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addResolver"></a>

```typescript
public addResolver(id: string, props: ExtendedResolverProps): Resolver
```

Add a resolver to the api.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addResolver.parameter.id"></a>

- *Type:* string

The resolver's id.

---

###### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.addResolver.parameter.props"></a>

- *Type:* aws-cdk-lib.aws_appsync.ExtendedResolverProps

the resolver properties.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.isConstruct"></a>

```typescript
import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct'

AmplifyGraphqlApi.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.apiId">apiId</a></code> | <code>string</code> | Generated Api Id. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.generatedFunctionSlots">generatedFunctionSlots</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot">MutationFunctionSlot</a> \| <a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot">QueryFunctionSlot</a> \| <a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]</code> | Resolvers generated by the transform process, persisted on the side in order to facilitate pulling a manifest for the purposes of inspecting and producing overrides. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.graphqlUrl">graphqlUrl</a></code> | <code>string</code> | Graphql URL For the generated API. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.realtimeUrl">realtimeUrl</a></code> | <code>string</code> | Realtime URL For the generated API. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.resources">resources</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources">AmplifyGraphqlApiResources</a></code> | Generated L1 and L2 CDK resources. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.apiKey">apiKey</a></code> | <code>string</code> | Generated Api Key if generated. |

---

##### `node`<sup>Required</sup> <a name="node" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `apiId`<sup>Required</sup> <a name="apiId" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.apiId"></a>

```typescript
public readonly apiId: string;
```

- *Type:* string

Generated Api Id.

May be a CDK Token.

---

##### `generatedFunctionSlots`<sup>Required</sup> <a name="generatedFunctionSlots" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.generatedFunctionSlots"></a>

```typescript
public readonly generatedFunctionSlots: MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot[];
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot">MutationFunctionSlot</a> | <a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot">QueryFunctionSlot</a> | <a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]

Resolvers generated by the transform process, persisted on the side in order to facilitate pulling a manifest for the purposes of inspecting and producing overrides.

---

##### `graphqlUrl`<sup>Required</sup> <a name="graphqlUrl" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.graphqlUrl"></a>

```typescript
public readonly graphqlUrl: string;
```

- *Type:* string

Graphql URL For the generated API.

May be a CDK Token.

---

##### `realtimeUrl`<sup>Required</sup> <a name="realtimeUrl" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.realtimeUrl"></a>

```typescript
public readonly realtimeUrl: string;
```

- *Type:* string

Realtime URL For the generated API.

May be a CDK Token.

---

##### `resources`<sup>Required</sup> <a name="resources" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.resources"></a>

```typescript
public readonly resources: AmplifyGraphqlApiResources;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources">AmplifyGraphqlApiResources</a>

Generated L1 and L2 CDK resources.

---

##### `apiKey`<sup>Optional</sup> <a name="apiKey" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApi.property.apiKey"></a>

```typescript
public readonly apiKey: string;
```

- *Type:* string

Generated Api Key if generated.

May be a CDK Token.

---


## Structs <a name="Structs" id="Structs"></a>

### AddFunctionProps <a name="AddFunctionProps" id="@aws-amplify/graphql-api-construct.AddFunctionProps"></a>

Input type properties when adding a new appsync.AppsyncFunction to the generated API. This is equivalent to the Omit<appsync.AppsyncFunctionProps, 'api'>.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.AddFunctionProps.Initializer"></a>

```typescript
import { AddFunctionProps } from '@aws-amplify/graphql-api-construct'

const addFunctionProps: AddFunctionProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AddFunctionProps.property.dataSource">dataSource</a></code> | <code>aws-cdk-lib.aws_appsync.BaseDataSource</code> | the data source linked to this AppSync Function. |
| <code><a href="#@aws-amplify/graphql-api-construct.AddFunctionProps.property.name">name</a></code> | <code>string</code> | the name of the AppSync Function. |
| <code><a href="#@aws-amplify/graphql-api-construct.AddFunctionProps.property.code">code</a></code> | <code>aws-cdk-lib.aws_appsync.Code</code> | The function code. |
| <code><a href="#@aws-amplify/graphql-api-construct.AddFunctionProps.property.description">description</a></code> | <code>string</code> | the description for this AppSync Function. |
| <code><a href="#@aws-amplify/graphql-api-construct.AddFunctionProps.property.requestMappingTemplate">requestMappingTemplate</a></code> | <code>aws-cdk-lib.aws_appsync.MappingTemplate</code> | the request mapping template for the AppSync Function. |
| <code><a href="#@aws-amplify/graphql-api-construct.AddFunctionProps.property.responseMappingTemplate">responseMappingTemplate</a></code> | <code>aws-cdk-lib.aws_appsync.MappingTemplate</code> | the response mapping template for the AppSync Function. |
| <code><a href="#@aws-amplify/graphql-api-construct.AddFunctionProps.property.runtime">runtime</a></code> | <code>aws-cdk-lib.aws_appsync.FunctionRuntime</code> | The functions runtime. |

---

##### `dataSource`<sup>Required</sup> <a name="dataSource" id="@aws-amplify/graphql-api-construct.AddFunctionProps.property.dataSource"></a>

```typescript
public readonly dataSource: BaseDataSource;
```

- *Type:* aws-cdk-lib.aws_appsync.BaseDataSource

the data source linked to this AppSync Function.

---

##### `name`<sup>Required</sup> <a name="name" id="@aws-amplify/graphql-api-construct.AddFunctionProps.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

the name of the AppSync Function.

---

##### `code`<sup>Optional</sup> <a name="code" id="@aws-amplify/graphql-api-construct.AddFunctionProps.property.code"></a>

```typescript
public readonly code: Code;
```

- *Type:* aws-cdk-lib.aws_appsync.Code
- *Default:* no code is used

The function code.

---

##### `description`<sup>Optional</sup> <a name="description" id="@aws-amplify/graphql-api-construct.AddFunctionProps.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string
- *Default:* no description

the description for this AppSync Function.

---

##### `requestMappingTemplate`<sup>Optional</sup> <a name="requestMappingTemplate" id="@aws-amplify/graphql-api-construct.AddFunctionProps.property.requestMappingTemplate"></a>

```typescript
public readonly requestMappingTemplate: MappingTemplate;
```

- *Type:* aws-cdk-lib.aws_appsync.MappingTemplate
- *Default:* no request mapping template

the request mapping template for the AppSync Function.

---

##### `responseMappingTemplate`<sup>Optional</sup> <a name="responseMappingTemplate" id="@aws-amplify/graphql-api-construct.AddFunctionProps.property.responseMappingTemplate"></a>

```typescript
public readonly responseMappingTemplate: MappingTemplate;
```

- *Type:* aws-cdk-lib.aws_appsync.MappingTemplate
- *Default:* no response mapping template

the response mapping template for the AppSync Function.

---

##### `runtime`<sup>Optional</sup> <a name="runtime" id="@aws-amplify/graphql-api-construct.AddFunctionProps.property.runtime"></a>

```typescript
public readonly runtime: FunctionRuntime;
```

- *Type:* aws-cdk-lib.aws_appsync.FunctionRuntime
- *Default:* no function runtime, VTL mapping templates used

The functions runtime.

---

### AmplifyDynamoDbModelDataSourceStrategy <a name="AmplifyDynamoDbModelDataSourceStrategy" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbModelDataSourceStrategy"></a>

Use custom resource type 'Custom::AmplifyDynamoDBTable' to provision table.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbModelDataSourceStrategy.Initializer"></a>

```typescript
import { AmplifyDynamoDbModelDataSourceStrategy } from '@aws-amplify/graphql-api-construct'

const amplifyDynamoDbModelDataSourceStrategy: AmplifyDynamoDbModelDataSourceStrategy = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbModelDataSourceStrategy.property.dbType">dbType</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbModelDataSourceStrategy.property.provisionStrategy">provisionStrategy</a></code> | <code>string</code> | *No description.* |

---

##### `dbType`<sup>Required</sup> <a name="dbType" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbModelDataSourceStrategy.property.dbType"></a>

```typescript
public readonly dbType: string;
```

- *Type:* string

---

##### `provisionStrategy`<sup>Required</sup> <a name="provisionStrategy" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbModelDataSourceStrategy.property.provisionStrategy"></a>

```typescript
public readonly provisionStrategy: string;
```

- *Type:* string

---

### AmplifyGraphqlApiCfnResources <a name="AmplifyGraphqlApiCfnResources" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources"></a>

L1 CDK resources from the Api which were generated as part of the transform.

These are potentially stored under nested stacks, but presented organized by type instead.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.Initializer"></a>

```typescript
import { AmplifyGraphqlApiCfnResources } from '@aws-amplify/graphql-api-construct'

const amplifyGraphqlApiCfnResources: AmplifyGraphqlApiCfnResources = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.additionalCfnResources">additionalCfnResources</a></code> | <code>{[ key: string ]: aws-cdk-lib.CfnResource}</code> | Remaining L1 resources generated, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.amplifyDynamoDbTables">amplifyDynamoDbTables</a></code> | <code>{[ key: string ]: <a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper">AmplifyDynamoDbTableWrapper</a>}</code> | The Generated Amplify DynamoDb Table L1 resource wrapper, keyed by model type name. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnDataSources">cfnDataSources</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_appsync.CfnDataSource}</code> | The Generated AppSync DataSource L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnFunctionConfigurations">cfnFunctionConfigurations</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_appsync.CfnFunctionConfiguration}</code> | The Generated AppSync Function L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnFunctions">cfnFunctions</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_lambda.CfnFunction}</code> | The Generated Lambda Function L1 Resources, keyed by function name. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnGraphqlApi">cfnGraphqlApi</a></code> | <code>aws-cdk-lib.aws_appsync.CfnGraphQLApi</code> | The Generated AppSync Api L1 Resource. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnGraphqlSchema">cfnGraphqlSchema</a></code> | <code>aws-cdk-lib.aws_appsync.CfnGraphQLSchema</code> | The Generated AppSync Schema L1 Resource. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnResolvers">cfnResolvers</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_appsync.CfnResolver}</code> | The Generated AppSync Resolver L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnRoles">cfnRoles</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_iam.CfnRole}</code> | The Generated IAM Role L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnTables">cfnTables</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_dynamodb.CfnTable}</code> | The Generated DynamoDB Table L1 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnApiKey">cfnApiKey</a></code> | <code>aws-cdk-lib.aws_appsync.CfnApiKey</code> | The Generated AppSync Api Key L1 Resource. |

---

##### `additionalCfnResources`<sup>Required</sup> <a name="additionalCfnResources" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.additionalCfnResources"></a>

```typescript
public readonly additionalCfnResources: {[ key: string ]: CfnResource};
```

- *Type:* {[ key: string ]: aws-cdk-lib.CfnResource}

Remaining L1 resources generated, keyed by logicalId.

---

##### `amplifyDynamoDbTables`<sup>Required</sup> <a name="amplifyDynamoDbTables" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.amplifyDynamoDbTables"></a>

```typescript
public readonly amplifyDynamoDbTables: {[ key: string ]: AmplifyDynamoDbTableWrapper};
```

- *Type:* {[ key: string ]: <a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper">AmplifyDynamoDbTableWrapper</a>}

The Generated Amplify DynamoDb Table L1 resource wrapper, keyed by model type name.

---

##### `cfnDataSources`<sup>Required</sup> <a name="cfnDataSources" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnDataSources"></a>

```typescript
public readonly cfnDataSources: {[ key: string ]: CfnDataSource};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_appsync.CfnDataSource}

The Generated AppSync DataSource L1 Resources, keyed by logicalId.

---

##### `cfnFunctionConfigurations`<sup>Required</sup> <a name="cfnFunctionConfigurations" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnFunctionConfigurations"></a>

```typescript
public readonly cfnFunctionConfigurations: {[ key: string ]: CfnFunctionConfiguration};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_appsync.CfnFunctionConfiguration}

The Generated AppSync Function L1 Resources, keyed by logicalId.

---

##### `cfnFunctions`<sup>Required</sup> <a name="cfnFunctions" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnFunctions"></a>

```typescript
public readonly cfnFunctions: {[ key: string ]: CfnFunction};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_lambda.CfnFunction}

The Generated Lambda Function L1 Resources, keyed by function name.

---

##### `cfnGraphqlApi`<sup>Required</sup> <a name="cfnGraphqlApi" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnGraphqlApi"></a>

```typescript
public readonly cfnGraphqlApi: CfnGraphQLApi;
```

- *Type:* aws-cdk-lib.aws_appsync.CfnGraphQLApi

The Generated AppSync Api L1 Resource.

---

##### `cfnGraphqlSchema`<sup>Required</sup> <a name="cfnGraphqlSchema" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnGraphqlSchema"></a>

```typescript
public readonly cfnGraphqlSchema: CfnGraphQLSchema;
```

- *Type:* aws-cdk-lib.aws_appsync.CfnGraphQLSchema

The Generated AppSync Schema L1 Resource.

---

##### `cfnResolvers`<sup>Required</sup> <a name="cfnResolvers" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnResolvers"></a>

```typescript
public readonly cfnResolvers: {[ key: string ]: CfnResolver};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_appsync.CfnResolver}

The Generated AppSync Resolver L1 Resources, keyed by logicalId.

---

##### `cfnRoles`<sup>Required</sup> <a name="cfnRoles" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnRoles"></a>

```typescript
public readonly cfnRoles: {[ key: string ]: CfnRole};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_iam.CfnRole}

The Generated IAM Role L1 Resources, keyed by logicalId.

---

##### `cfnTables`<sup>Required</sup> <a name="cfnTables" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnTables"></a>

```typescript
public readonly cfnTables: {[ key: string ]: CfnTable};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_dynamodb.CfnTable}

The Generated DynamoDB Table L1 Resources, keyed by logicalId.

---

##### `cfnApiKey`<sup>Optional</sup> <a name="cfnApiKey" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources.property.cfnApiKey"></a>

```typescript
public readonly cfnApiKey: CfnApiKey;
```

- *Type:* aws-cdk-lib.aws_appsync.CfnApiKey

The Generated AppSync Api Key L1 Resource.

---

### AmplifyGraphqlApiProps <a name="AmplifyGraphqlApiProps" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps"></a>

Input props for the AmplifyGraphqlApi construct.

Specifies what the input to transform into an Api, and configurations for
the transformation process.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.Initializer"></a>

```typescript
import { AmplifyGraphqlApiProps } from '@aws-amplify/graphql-api-construct'

const amplifyGraphqlApiProps: AmplifyGraphqlApiProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.authorizationModes">authorizationModes</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.AuthorizationModes">AuthorizationModes</a></code> | Required auth modes for the Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.definition">definition</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition">IAmplifyGraphqlDefinition</a></code> | The definition to transform in a full Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.apiName">apiName</a></code> | <code>string</code> | Name to be used for the AppSync Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.conflictResolution">conflictResolution</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.ConflictResolution">ConflictResolution</a></code> | Configure conflict resolution on the Api, which is required to enable DataStore Api functionality. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.dataStoreConfiguration">dataStoreConfiguration</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.DataStoreConfiguration">DataStoreConfiguration</a></code> | Configure DataStore conflict resolution on the Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.disableOutputStorage">disableOutputStorage</a></code> | <code>boolean</code> | Disables storing construct output. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.functionNameMap">functionNameMap</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}</code> | Lambda functions referenced in the definitions's. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.functionSlots">functionSlots</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot">MutationFunctionSlot</a> \| <a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot">QueryFunctionSlot</a> \| <a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]</code> | Overrides for a given slot in the generated resolver pipelines. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.outputStorageStrategy">outputStorageStrategy</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.IBackendOutputStorageStrategy">IBackendOutputStorageStrategy</a></code> | Strategy to store construct outputs. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.predictionsBucket">predictionsBucket</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | If using predictions, a bucket must be provided which will be used to search for assets. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.stackMappings">stackMappings</a></code> | <code>{[ key: string ]: string}</code> | StackMappings override the assigned nested stack on a per-resource basis. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.transformerPlugins">transformerPlugins</a></code> | <code>any[]</code> | Provide a list of additional custom transformers which are injected into the transform process. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.translationBehavior">translationBehavior</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior">PartialTranslationBehavior</a></code> | This replaces feature flags from the Api construct, for general information on what these parameters do, refer to https://docs.amplify.aws/cli/reference/feature-flags/#graphQLTransformer. |

---

##### `authorizationModes`<sup>Required</sup> <a name="authorizationModes" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.authorizationModes"></a>

```typescript
public readonly authorizationModes: AuthorizationModes;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.AuthorizationModes">AuthorizationModes</a>

Required auth modes for the Api.

This object must be a superset of the configured auth providers in the Api definition.
For more information, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/

---

##### `definition`<sup>Required</sup> <a name="definition" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.definition"></a>

```typescript
public readonly definition: IAmplifyGraphqlDefinition;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition">IAmplifyGraphqlDefinition</a>

The definition to transform in a full Api.

Can be constructed via the AmplifyGraphqlDefinition class.

---

##### `apiName`<sup>Optional</sup> <a name="apiName" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.apiName"></a>

```typescript
public readonly apiName: string;
```

- *Type:* string

Name to be used for the AppSync Api.

Default: construct id.

---

##### ~~`conflictResolution`~~<sup>Optional</sup> <a name="conflictResolution" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.conflictResolution"></a>

- *Deprecated:* use dataStoreConfiguration instead.

```typescript
public readonly conflictResolution: ConflictResolution;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.ConflictResolution">ConflictResolution</a>

Configure conflict resolution on the Api, which is required to enable DataStore Api functionality.

For more information, refer to https://docs.amplify.aws/lib/datastore/getting-started/q/platform/js/

---

##### `dataStoreConfiguration`<sup>Optional</sup> <a name="dataStoreConfiguration" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.dataStoreConfiguration"></a>

```typescript
public readonly dataStoreConfiguration: DataStoreConfiguration;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.DataStoreConfiguration">DataStoreConfiguration</a>

Configure DataStore conflict resolution on the Api.

Conflict resolution is required to enable DataStore Api functionality.
For more information, refer to https://docs.amplify.aws/lib/datastore/getting-started/q/platform/js/

---

##### `disableOutputStorage`<sup>Optional</sup> <a name="disableOutputStorage" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.disableOutputStorage"></a>

```typescript
public readonly disableOutputStorage: boolean;
```

- *Type:* boolean

Disables storing construct output.

Output storage should be disabled when creating multiple GraphQL APIs in a single CDK synthesis.
outputStorageStrategy will be ignored if this is set to true.

---

##### `functionNameMap`<sup>Optional</sup> <a name="functionNameMap" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.functionNameMap"></a>

```typescript
public readonly functionNameMap: {[ key: string ]: IFunction};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}

Lambda functions referenced in the definitions's.

---

##### `functionSlots`<sup>Optional</sup> <a name="functionSlots" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.functionSlots"></a>

```typescript
public readonly functionSlots: MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot[];
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot">MutationFunctionSlot</a> | <a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot">QueryFunctionSlot</a> | <a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]

Overrides for a given slot in the generated resolver pipelines.

For more information about what slots are available,
refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#override-amplify-generated-resolvers.

---

##### `outputStorageStrategy`<sup>Optional</sup> <a name="outputStorageStrategy" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.outputStorageStrategy"></a>

```typescript
public readonly outputStorageStrategy: IBackendOutputStorageStrategy;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.IBackendOutputStorageStrategy">IBackendOutputStorageStrategy</a>

Strategy to store construct outputs.

If no outputStorageStrategey is provided a default strategy will be used.

---

##### `predictionsBucket`<sup>Optional</sup> <a name="predictionsBucket" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.predictionsBucket"></a>

```typescript
public readonly predictionsBucket: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

If using predictions, a bucket must be provided which will be used to search for assets.

---

##### `stackMappings`<sup>Optional</sup> <a name="stackMappings" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.stackMappings"></a>

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

##### `transformerPlugins`<sup>Optional</sup> <a name="transformerPlugins" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.transformerPlugins"></a>

```typescript
public readonly transformerPlugins: any[];
```

- *Type:* any[]

Provide a list of additional custom transformers which are injected into the transform process.

These custom transformers must be implemented with aws-cdk-lib >=2.80.0, and

---

##### `translationBehavior`<sup>Optional</sup> <a name="translationBehavior" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps.property.translationBehavior"></a>

```typescript
public readonly translationBehavior: PartialTranslationBehavior;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior">PartialTranslationBehavior</a>

This replaces feature flags from the Api construct, for general information on what these parameters do, refer to https://docs.amplify.aws/cli/reference/feature-flags/#graphQLTransformer.

---

### AmplifyGraphqlApiResources <a name="AmplifyGraphqlApiResources" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources"></a>

Accessible resources from the Api which were generated as part of the transform.

These are potentially stored under nested stacks, but presented organized by type instead.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.Initializer"></a>

```typescript
import { AmplifyGraphqlApiResources } from '@aws-amplify/graphql-api-construct'

const amplifyGraphqlApiResources: AmplifyGraphqlApiResources = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.cfnResources">cfnResources</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources">AmplifyGraphqlApiCfnResources</a></code> | L1 Cfn Resources, for when dipping down a level of abstraction is desirable. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.functions">functions</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}</code> | The Generated Lambda Function L1 Resources, keyed by function name. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.graphqlApi">graphqlApi</a></code> | <code>aws-cdk-lib.aws_appsync.IGraphqlApi</code> | The Generated AppSync Api L2 Resource, includes the Schema. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.nestedStacks">nestedStacks</a></code> | <code>{[ key: string ]: aws-cdk-lib.NestedStack}</code> | Nested Stacks generated by the Api Construct. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.roles">roles</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_iam.IRole}</code> | The Generated IAM Role L2 Resources, keyed by logicalId. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.tables">tables</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_dynamodb.ITable}</code> | The Generated DynamoDB Table L2 Resources, keyed by logicalId. |

---

##### `cfnResources`<sup>Required</sup> <a name="cfnResources" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.cfnResources"></a>

```typescript
public readonly cfnResources: AmplifyGraphqlApiCfnResources;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlApiCfnResources">AmplifyGraphqlApiCfnResources</a>

L1 Cfn Resources, for when dipping down a level of abstraction is desirable.

---

##### `functions`<sup>Required</sup> <a name="functions" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.functions"></a>

```typescript
public readonly functions: {[ key: string ]: IFunction};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}

The Generated Lambda Function L1 Resources, keyed by function name.

---

##### `graphqlApi`<sup>Required</sup> <a name="graphqlApi" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.graphqlApi"></a>

```typescript
public readonly graphqlApi: IGraphqlApi;
```

- *Type:* aws-cdk-lib.aws_appsync.IGraphqlApi

The Generated AppSync Api L2 Resource, includes the Schema.

---

##### `nestedStacks`<sup>Required</sup> <a name="nestedStacks" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.nestedStacks"></a>

```typescript
public readonly nestedStacks: {[ key: string ]: NestedStack};
```

- *Type:* {[ key: string ]: aws-cdk-lib.NestedStack}

Nested Stacks generated by the Api Construct.

---

##### `roles`<sup>Required</sup> <a name="roles" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.roles"></a>

```typescript
public readonly roles: {[ key: string ]: IRole};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_iam.IRole}

The Generated IAM Role L2 Resources, keyed by logicalId.

---

##### `tables`<sup>Required</sup> <a name="tables" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources.property.tables"></a>

```typescript
public readonly tables: {[ key: string ]: ITable};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_dynamodb.ITable}

The Generated DynamoDB Table L2 Resources, keyed by logicalId.

---

### ApiKeyAuthorizationConfig <a name="ApiKeyAuthorizationConfig" id="@aws-amplify/graphql-api-construct.ApiKeyAuthorizationConfig"></a>

Configuration for Api Keys on the Graphql Api.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.ApiKeyAuthorizationConfig.Initializer"></a>

```typescript
import { ApiKeyAuthorizationConfig } from '@aws-amplify/graphql-api-construct'

const apiKeyAuthorizationConfig: ApiKeyAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.ApiKeyAuthorizationConfig.property.expires">expires</a></code> | <code>aws-cdk-lib.Duration</code> | A duration representing the time from Cloudformation deploy until expiry. |
| <code><a href="#@aws-amplify/graphql-api-construct.ApiKeyAuthorizationConfig.property.description">description</a></code> | <code>string</code> | Optional description for the Api Key to attach to the Api. |

---

##### `expires`<sup>Required</sup> <a name="expires" id="@aws-amplify/graphql-api-construct.ApiKeyAuthorizationConfig.property.expires"></a>

```typescript
public readonly expires: Duration;
```

- *Type:* aws-cdk-lib.Duration

A duration representing the time from Cloudformation deploy until expiry.

---

##### `description`<sup>Optional</sup> <a name="description" id="@aws-amplify/graphql-api-construct.ApiKeyAuthorizationConfig.property.description"></a>

```typescript
public readonly description: string;
```

- *Type:* string

Optional description for the Api Key to attach to the Api.

---

### AuthorizationModes <a name="AuthorizationModes" id="@aws-amplify/graphql-api-construct.AuthorizationModes"></a>

Authorization Modes to apply to the Api.

At least one modes must be provided, and if more than one are provided a defaultAuthorizationMode must be specified.
For more information on Amplify Api auth, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/#authorization-strategies

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.AuthorizationModes.Initializer"></a>

```typescript
import { AuthorizationModes } from '@aws-amplify/graphql-api-construct'

const authorizationModes: AuthorizationModes = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AuthorizationModes.property.adminRoles">adminRoles</a></code> | <code>aws-cdk-lib.aws_iam.IRole[]</code> | A list of roles granted full R/W access to the Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AuthorizationModes.property.apiKeyConfig">apiKeyConfig</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.ApiKeyAuthorizationConfig">ApiKeyAuthorizationConfig</a></code> | AppSync Api Key config, required if a 'apiKey' auth provider is specified in the Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AuthorizationModes.property.defaultAuthorizationMode">defaultAuthorizationMode</a></code> | <code>string</code> | Default auth mode to provide to the Api, required if more than one config type is specified. |
| <code><a href="#@aws-amplify/graphql-api-construct.AuthorizationModes.property.iamConfig">iamConfig</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.IAMAuthorizationConfig">IAMAuthorizationConfig</a></code> | IAM Auth config, required if an 'iam' auth provider is specified in the Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AuthorizationModes.property.lambdaConfig">lambdaConfig</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.LambdaAuthorizationConfig">LambdaAuthorizationConfig</a></code> | Lambda config, required if a 'function' auth provider is specified in the Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AuthorizationModes.property.oidcConfig">oidcConfig</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig">OIDCAuthorizationConfig</a></code> | Cognito OIDC config, required if a 'oidc' auth provider is specified in the Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.AuthorizationModes.property.userPoolConfig">userPoolConfig</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.UserPoolAuthorizationConfig">UserPoolAuthorizationConfig</a></code> | Cognito UserPool config, required if a 'userPools' auth provider is specified in the Api. |

---

##### ~~`adminRoles`~~<sup>Optional</sup> <a name="adminRoles" id="@aws-amplify/graphql-api-construct.AuthorizationModes.property.adminRoles"></a>

- *Deprecated:* , use iamConfig.allowListedRoles instead.

```typescript
public readonly adminRoles: IRole[];
```

- *Type:* aws-cdk-lib.aws_iam.IRole[]

A list of roles granted full R/W access to the Api.

---

##### `apiKeyConfig`<sup>Optional</sup> <a name="apiKeyConfig" id="@aws-amplify/graphql-api-construct.AuthorizationModes.property.apiKeyConfig"></a>

```typescript
public readonly apiKeyConfig: ApiKeyAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.ApiKeyAuthorizationConfig">ApiKeyAuthorizationConfig</a>

AppSync Api Key config, required if a 'apiKey' auth provider is specified in the Api.

Applies to 'public' auth strategy.

---

##### `defaultAuthorizationMode`<sup>Optional</sup> <a name="defaultAuthorizationMode" id="@aws-amplify/graphql-api-construct.AuthorizationModes.property.defaultAuthorizationMode"></a>

```typescript
public readonly defaultAuthorizationMode: string;
```

- *Type:* string

Default auth mode to provide to the Api, required if more than one config type is specified.

---

##### `iamConfig`<sup>Optional</sup> <a name="iamConfig" id="@aws-amplify/graphql-api-construct.AuthorizationModes.property.iamConfig"></a>

```typescript
public readonly iamConfig: IAMAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.IAMAuthorizationConfig">IAMAuthorizationConfig</a>

IAM Auth config, required if an 'iam' auth provider is specified in the Api.

Applies to 'public' and 'private' auth strategies.

---

##### `lambdaConfig`<sup>Optional</sup> <a name="lambdaConfig" id="@aws-amplify/graphql-api-construct.AuthorizationModes.property.lambdaConfig"></a>

```typescript
public readonly lambdaConfig: LambdaAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.LambdaAuthorizationConfig">LambdaAuthorizationConfig</a>

Lambda config, required if a 'function' auth provider is specified in the Api.

Applies to 'custom' auth strategy.

---

##### `oidcConfig`<sup>Optional</sup> <a name="oidcConfig" id="@aws-amplify/graphql-api-construct.AuthorizationModes.property.oidcConfig"></a>

```typescript
public readonly oidcConfig: OIDCAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig">OIDCAuthorizationConfig</a>

Cognito OIDC config, required if a 'oidc' auth provider is specified in the Api.

Applies to 'owner', 'private', and 'group' auth strategies.

---

##### `userPoolConfig`<sup>Optional</sup> <a name="userPoolConfig" id="@aws-amplify/graphql-api-construct.AuthorizationModes.property.userPoolConfig"></a>

```typescript
public readonly userPoolConfig: UserPoolAuthorizationConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.UserPoolAuthorizationConfig">UserPoolAuthorizationConfig</a>

Cognito UserPool config, required if a 'userPools' auth provider is specified in the Api.

Applies to 'owner', 'private', and 'group' auth strategies.

---

### AutomergeConflictResolutionStrategy <a name="AutomergeConflictResolutionStrategy" id="@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy"></a>

Enable optimistic concurrency on the project.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy.Initializer"></a>

```typescript
import { AutomergeConflictResolutionStrategy } from '@aws-amplify/graphql-api-construct'

const automergeConflictResolutionStrategy: AutomergeConflictResolutionStrategy = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy.property.detectionType">detectionType</a></code> | <code>string</code> | The conflict detection type used for resolution. |
| <code><a href="#@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy.property.handlerType">handlerType</a></code> | <code>string</code> | This conflict resolution strategy executes an auto-merge. |

---

##### `detectionType`<sup>Required</sup> <a name="detectionType" id="@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy.property.detectionType"></a>

```typescript
public readonly detectionType: string;
```

- *Type:* string

The conflict detection type used for resolution.

---

##### `handlerType`<sup>Required</sup> <a name="handlerType" id="@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy.property.handlerType"></a>

```typescript
public readonly handlerType: string;
```

- *Type:* string

This conflict resolution strategy executes an auto-merge.

For more information, refer to https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html#conflict-detection-and-resolution

---

### ConflictResolution <a name="ConflictResolution" id="@aws-amplify/graphql-api-construct.ConflictResolution"></a>

Project level configuration for conflict resolution.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.ConflictResolution.Initializer"></a>

```typescript
import { ConflictResolution } from '@aws-amplify/graphql-api-construct'

const conflictResolution: ConflictResolution = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.ConflictResolution.property.models">models</a></code> | <code>{[ key: string ]: <a href="#@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a>}</code> | Model-specific conflict resolution overrides. |
| <code><a href="#@aws-amplify/graphql-api-construct.ConflictResolution.property.project">project</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a></code> | Project-wide config for conflict resolution. |

---

##### ~~`models`~~<sup>Optional</sup> <a name="models" id="@aws-amplify/graphql-api-construct.ConflictResolution.property.models"></a>

- *Deprecated:* use DataStoreConfiguration instead.

```typescript
public readonly models: {[ key: string ]: AutomergeConflictResolutionStrategy | OptimisticConflictResolutionStrategy | CustomConflictResolutionStrategy};
```

- *Type:* {[ key: string ]: <a href="#@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a>}

Model-specific conflict resolution overrides.

---

##### ~~`project`~~<sup>Optional</sup> <a name="project" id="@aws-amplify/graphql-api-construct.ConflictResolution.property.project"></a>

- *Deprecated:* use DataStoreConfiguration instead.

```typescript
public readonly project: AutomergeConflictResolutionStrategy | OptimisticConflictResolutionStrategy | CustomConflictResolutionStrategy;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a>

Project-wide config for conflict resolution.

Applies to all non-overridden models.

---

### ConflictResolutionStrategyBase <a name="ConflictResolutionStrategyBase" id="@aws-amplify/graphql-api-construct.ConflictResolutionStrategyBase"></a>

Common parameters for conflict resolution.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.ConflictResolutionStrategyBase.Initializer"></a>

```typescript
import { ConflictResolutionStrategyBase } from '@aws-amplify/graphql-api-construct'

const conflictResolutionStrategyBase: ConflictResolutionStrategyBase = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.ConflictResolutionStrategyBase.property.detectionType">detectionType</a></code> | <code>string</code> | The conflict detection type used for resolution. |

---

##### `detectionType`<sup>Required</sup> <a name="detectionType" id="@aws-amplify/graphql-api-construct.ConflictResolutionStrategyBase.property.detectionType"></a>

```typescript
public readonly detectionType: string;
```

- *Type:* string

The conflict detection type used for resolution.

---

### CustomConflictResolutionStrategy <a name="CustomConflictResolutionStrategy" id="@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy"></a>

Enable custom sync on the project, powered by a lambda.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy.Initializer"></a>

```typescript
import { CustomConflictResolutionStrategy } from '@aws-amplify/graphql-api-construct'

const customConflictResolutionStrategy: CustomConflictResolutionStrategy = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy.property.detectionType">detectionType</a></code> | <code>string</code> | The conflict detection type used for resolution. |
| <code><a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy.property.conflictHandler">conflictHandler</a></code> | <code>aws-cdk-lib.aws_lambda.IFunction</code> | The function which will be invoked for conflict resolution. |
| <code><a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy.property.handlerType">handlerType</a></code> | <code>string</code> | This conflict resolution strategy uses a lambda handler type. |

---

##### `detectionType`<sup>Required</sup> <a name="detectionType" id="@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy.property.detectionType"></a>

```typescript
public readonly detectionType: string;
```

- *Type:* string

The conflict detection type used for resolution.

---

##### `conflictHandler`<sup>Required</sup> <a name="conflictHandler" id="@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy.property.conflictHandler"></a>

```typescript
public readonly conflictHandler: IFunction;
```

- *Type:* aws-cdk-lib.aws_lambda.IFunction

The function which will be invoked for conflict resolution.

---

##### `handlerType`<sup>Required</sup> <a name="handlerType" id="@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy.property.handlerType"></a>

```typescript
public readonly handlerType: string;
```

- *Type:* string

This conflict resolution strategy uses a lambda handler type.

For more information, refer to https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html#conflict-detection-and-resolution

---

### CustomSqlDataSourceStrategy <a name="CustomSqlDataSourceStrategy" id="@aws-amplify/graphql-api-construct.CustomSqlDataSourceStrategy"></a>

The input type for defining a ModelDataSourceStrategy used to resolve a field annotated with a `@sql` directive.

Although this is a
public type, you should rarely need to use this. The AmplifyGraphqlDefinition factory methods (e.g., `fromString`,
`fromFilesAndStrategy`) will automatically construct this structure for you.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.CustomSqlDataSourceStrategy.Initializer"></a>

```typescript
import { CustomSqlDataSourceStrategy } from '@aws-amplify/graphql-api-construct'

const customSqlDataSourceStrategy: CustomSqlDataSourceStrategy = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.CustomSqlDataSourceStrategy.property.fieldName">fieldName</a></code> | <code>string</code> | The field name with which the custom SQL is associated. |
| <code><a href="#@aws-amplify/graphql-api-construct.CustomSqlDataSourceStrategy.property.strategy">strategy</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy">SQLLambdaModelDataSourceStrategy</a></code> | The strategy used to create the datasource that will resolve the custom SQL statement. |
| <code><a href="#@aws-amplify/graphql-api-construct.CustomSqlDataSourceStrategy.property.typeName">typeName</a></code> | <code>string</code> | The built-in type (either "Query" or "Mutation") with which the custom SQL is associated. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-api-construct.CustomSqlDataSourceStrategy.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field name with which the custom SQL is associated.

---

##### `strategy`<sup>Required</sup> <a name="strategy" id="@aws-amplify/graphql-api-construct.CustomSqlDataSourceStrategy.property.strategy"></a>

```typescript
public readonly strategy: SQLLambdaModelDataSourceStrategy;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy">SQLLambdaModelDataSourceStrategy</a>

The strategy used to create the datasource that will resolve the custom SQL statement.

---

##### `typeName`<sup>Required</sup> <a name="typeName" id="@aws-amplify/graphql-api-construct.CustomSqlDataSourceStrategy.property.typeName"></a>

```typescript
public readonly typeName: string;
```

- *Type:* string

The built-in type (either "Query" or "Mutation") with which the custom SQL is associated.

---

### DataStoreConfiguration <a name="DataStoreConfiguration" id="@aws-amplify/graphql-api-construct.DataStoreConfiguration"></a>

Project level configuration for DataStore.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.DataStoreConfiguration.Initializer"></a>

```typescript
import { DataStoreConfiguration } from '@aws-amplify/graphql-api-construct'

const dataStoreConfiguration: DataStoreConfiguration = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.DataStoreConfiguration.property.models">models</a></code> | <code>{[ key: string ]: <a href="#@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a>}</code> | Model-specific conflict resolution overrides. |
| <code><a href="#@aws-amplify/graphql-api-construct.DataStoreConfiguration.property.project">project</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> \| <a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a></code> | Project-wide config for conflict resolution. |

---

##### `models`<sup>Optional</sup> <a name="models" id="@aws-amplify/graphql-api-construct.DataStoreConfiguration.property.models"></a>

```typescript
public readonly models: {[ key: string ]: AutomergeConflictResolutionStrategy | OptimisticConflictResolutionStrategy | CustomConflictResolutionStrategy};
```

- *Type:* {[ key: string ]: <a href="#@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a>}

Model-specific conflict resolution overrides.

---

##### `project`<sup>Optional</sup> <a name="project" id="@aws-amplify/graphql-api-construct.DataStoreConfiguration.property.project"></a>

```typescript
public readonly project: AutomergeConflictResolutionStrategy | OptimisticConflictResolutionStrategy | CustomConflictResolutionStrategy;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.AutomergeConflictResolutionStrategy">AutomergeConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy">OptimisticConflictResolutionStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.CustomConflictResolutionStrategy">CustomConflictResolutionStrategy</a>

Project-wide config for conflict resolution.

Applies to all non-overridden models.

---

### DefaultDynamoDbModelDataSourceStrategy <a name="DefaultDynamoDbModelDataSourceStrategy" id="@aws-amplify/graphql-api-construct.DefaultDynamoDbModelDataSourceStrategy"></a>

Use default CloudFormation type 'AWS::DynamoDB::Table' to provision table.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.DefaultDynamoDbModelDataSourceStrategy.Initializer"></a>

```typescript
import { DefaultDynamoDbModelDataSourceStrategy } from '@aws-amplify/graphql-api-construct'

const defaultDynamoDbModelDataSourceStrategy: DefaultDynamoDbModelDataSourceStrategy = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.DefaultDynamoDbModelDataSourceStrategy.property.dbType">dbType</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@aws-amplify/graphql-api-construct.DefaultDynamoDbModelDataSourceStrategy.property.provisionStrategy">provisionStrategy</a></code> | <code>string</code> | *No description.* |

---

##### `dbType`<sup>Required</sup> <a name="dbType" id="@aws-amplify/graphql-api-construct.DefaultDynamoDbModelDataSourceStrategy.property.dbType"></a>

```typescript
public readonly dbType: string;
```

- *Type:* string

---

##### `provisionStrategy`<sup>Required</sup> <a name="provisionStrategy" id="@aws-amplify/graphql-api-construct.DefaultDynamoDbModelDataSourceStrategy.property.provisionStrategy"></a>

```typescript
public readonly provisionStrategy: string;
```

- *Type:* string

---

### FunctionSlotBase <a name="FunctionSlotBase" id="@aws-amplify/graphql-api-construct.FunctionSlotBase"></a>

Common slot parameters.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.FunctionSlotBase.Initializer"></a>

```typescript
import { FunctionSlotBase } from '@aws-amplify/graphql-api-construct'

const functionSlotBase: FunctionSlotBase = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.FunctionSlotBase.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the Api definition. |
| <code><a href="#@aws-amplify/graphql-api-construct.FunctionSlotBase.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-api-construct.FunctionSlotBase.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-api-construct.FunctionSlotBase.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the Api definition.

---

##### `function`<sup>Required</sup> <a name="function" id="@aws-amplify/graphql-api-construct.FunctionSlotBase.property.function"></a>

```typescript
public readonly function: FunctionSlotOverride;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.FunctionSlotOverride">FunctionSlotOverride</a>

The overridden behavior for this slot.

---

##### `slotIndex`<sup>Required</sup> <a name="slotIndex" id="@aws-amplify/graphql-api-construct.FunctionSlotBase.property.slotIndex"></a>

```typescript
public readonly slotIndex: number;
```

- *Type:* number

The slot index to use to inject this into the execution pipeline.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

### FunctionSlotOverride <a name="FunctionSlotOverride" id="@aws-amplify/graphql-api-construct.FunctionSlotOverride"></a>

Params exposed to support configuring and overriding pipelined slots.

This allows configuration of the underlying function,
including the request and response mapping templates.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.FunctionSlotOverride.Initializer"></a>

```typescript
import { FunctionSlotOverride } from '@aws-amplify/graphql-api-construct'

const functionSlotOverride: FunctionSlotOverride = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.FunctionSlotOverride.property.requestMappingTemplate">requestMappingTemplate</a></code> | <code>aws-cdk-lib.aws_appsync.MappingTemplate</code> | Override request mapping template for the function slot. |
| <code><a href="#@aws-amplify/graphql-api-construct.FunctionSlotOverride.property.responseMappingTemplate">responseMappingTemplate</a></code> | <code>aws-cdk-lib.aws_appsync.MappingTemplate</code> | Override response mapping template for the function slot. |

---

##### `requestMappingTemplate`<sup>Optional</sup> <a name="requestMappingTemplate" id="@aws-amplify/graphql-api-construct.FunctionSlotOverride.property.requestMappingTemplate"></a>

```typescript
public readonly requestMappingTemplate: MappingTemplate;
```

- *Type:* aws-cdk-lib.aws_appsync.MappingTemplate

Override request mapping template for the function slot.

Executed before the datasource is invoked.

---

##### `responseMappingTemplate`<sup>Optional</sup> <a name="responseMappingTemplate" id="@aws-amplify/graphql-api-construct.FunctionSlotOverride.property.responseMappingTemplate"></a>

```typescript
public readonly responseMappingTemplate: MappingTemplate;
```

- *Type:* aws-cdk-lib.aws_appsync.MappingTemplate

Override response mapping template for the function slot.

Executed after the datasource is invoked.

---

### IAMAuthorizationConfig <a name="IAMAuthorizationConfig" id="@aws-amplify/graphql-api-construct.IAMAuthorizationConfig"></a>

Configuration for IAM Authorization on the Graphql Api.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.IAMAuthorizationConfig.Initializer"></a>

```typescript
import { IAMAuthorizationConfig } from '@aws-amplify/graphql-api-construct'

const iAMAuthorizationConfig: IAMAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.IAMAuthorizationConfig.property.authenticatedUserRole">authenticatedUserRole</a></code> | <code>aws-cdk-lib.aws_iam.IRole</code> | Authenticated user role, applies to { provider: iam, allow: private } access. |
| <code><a href="#@aws-amplify/graphql-api-construct.IAMAuthorizationConfig.property.identityPoolId">identityPoolId</a></code> | <code>string</code> | ID for the Cognito Identity Pool vending auth and unauth roles. |
| <code><a href="#@aws-amplify/graphql-api-construct.IAMAuthorizationConfig.property.unauthenticatedUserRole">unauthenticatedUserRole</a></code> | <code>aws-cdk-lib.aws_iam.IRole</code> | Unauthenticated user role, applies to { provider: iam, allow: public } access. |
| <code><a href="#@aws-amplify/graphql-api-construct.IAMAuthorizationConfig.property.allowListedRoles">allowListedRoles</a></code> | <code>string \| aws-cdk-lib.aws_iam.IRole[]</code> | A list of IAM roles which will be granted full read/write access to the generated model if IAM auth is enabled. |

---

##### `authenticatedUserRole`<sup>Required</sup> <a name="authenticatedUserRole" id="@aws-amplify/graphql-api-construct.IAMAuthorizationConfig.property.authenticatedUserRole"></a>

```typescript
public readonly authenticatedUserRole: IRole;
```

- *Type:* aws-cdk-lib.aws_iam.IRole

Authenticated user role, applies to { provider: iam, allow: private } access.

---

##### `identityPoolId`<sup>Required</sup> <a name="identityPoolId" id="@aws-amplify/graphql-api-construct.IAMAuthorizationConfig.property.identityPoolId"></a>

```typescript
public readonly identityPoolId: string;
```

- *Type:* string

ID for the Cognito Identity Pool vending auth and unauth roles.

Format: `<region>:<id string>`

---

##### `unauthenticatedUserRole`<sup>Required</sup> <a name="unauthenticatedUserRole" id="@aws-amplify/graphql-api-construct.IAMAuthorizationConfig.property.unauthenticatedUserRole"></a>

```typescript
public readonly unauthenticatedUserRole: IRole;
```

- *Type:* aws-cdk-lib.aws_iam.IRole

Unauthenticated user role, applies to { provider: iam, allow: public } access.

---

##### `allowListedRoles`<sup>Optional</sup> <a name="allowListedRoles" id="@aws-amplify/graphql-api-construct.IAMAuthorizationConfig.property.allowListedRoles"></a>

```typescript
public readonly allowListedRoles: string | IRole[];
```

- *Type:* string | aws-cdk-lib.aws_iam.IRole[]

A list of IAM roles which will be granted full read/write access to the generated model if IAM auth is enabled.

If an IRole is provided, the role `name` will be used for matching.
If a string is provided, the raw value will be used for matching.

---

### LambdaAuthorizationConfig <a name="LambdaAuthorizationConfig" id="@aws-amplify/graphql-api-construct.LambdaAuthorizationConfig"></a>

Configuration for Custom Lambda authorization on the Graphql Api.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.LambdaAuthorizationConfig.Initializer"></a>

```typescript
import { LambdaAuthorizationConfig } from '@aws-amplify/graphql-api-construct'

const lambdaAuthorizationConfig: LambdaAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.LambdaAuthorizationConfig.property.function">function</a></code> | <code>aws-cdk-lib.aws_lambda.IFunction</code> | The authorizer lambda function. |
| <code><a href="#@aws-amplify/graphql-api-construct.LambdaAuthorizationConfig.property.ttl">ttl</a></code> | <code>aws-cdk-lib.Duration</code> | How long the results are cached. |

---

##### `function`<sup>Required</sup> <a name="function" id="@aws-amplify/graphql-api-construct.LambdaAuthorizationConfig.property.function"></a>

```typescript
public readonly function: IFunction;
```

- *Type:* aws-cdk-lib.aws_lambda.IFunction

The authorizer lambda function.

---

##### `ttl`<sup>Required</sup> <a name="ttl" id="@aws-amplify/graphql-api-construct.LambdaAuthorizationConfig.property.ttl"></a>

```typescript
public readonly ttl: Duration;
```

- *Type:* aws-cdk-lib.Duration

How long the results are cached.

---

### MutationFunctionSlot <a name="MutationFunctionSlot" id="@aws-amplify/graphql-api-construct.MutationFunctionSlot"></a>

Slot types for Mutation Resolvers.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.MutationFunctionSlot.Initializer"></a>

```typescript
import { MutationFunctionSlot } from '@aws-amplify/graphql-api-construct'

const mutationFunctionSlot: MutationFunctionSlot = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the Api definition. |
| <code><a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |
| <code><a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot.property.slotName">slotName</a></code> | <code>string</code> | The slot name to inject this behavior into. |
| <code><a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot.property.typeName">typeName</a></code> | <code>string</code> | This slot type applies to the Mutation type on the Api definition. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-api-construct.MutationFunctionSlot.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the Api definition.

---

##### `function`<sup>Required</sup> <a name="function" id="@aws-amplify/graphql-api-construct.MutationFunctionSlot.property.function"></a>

```typescript
public readonly function: FunctionSlotOverride;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.FunctionSlotOverride">FunctionSlotOverride</a>

The overridden behavior for this slot.

---

##### `slotIndex`<sup>Required</sup> <a name="slotIndex" id="@aws-amplify/graphql-api-construct.MutationFunctionSlot.property.slotIndex"></a>

```typescript
public readonly slotIndex: number;
```

- *Type:* number

The slot index to use to inject this into the execution pipeline.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `slotName`<sup>Required</sup> <a name="slotName" id="@aws-amplify/graphql-api-construct.MutationFunctionSlot.property.slotName"></a>

```typescript
public readonly slotName: string;
```

- *Type:* string

The slot name to inject this behavior into.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `typeName`<sup>Required</sup> <a name="typeName" id="@aws-amplify/graphql-api-construct.MutationFunctionSlot.property.typeName"></a>

```typescript
public readonly typeName: string;
```

- *Type:* string

This slot type applies to the Mutation type on the Api definition.

---

### OIDCAuthorizationConfig <a name="OIDCAuthorizationConfig" id="@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig"></a>

Configuration for OpenId Connect Authorization on the Graphql Api.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.Initializer"></a>

```typescript
import { OIDCAuthorizationConfig } from '@aws-amplify/graphql-api-construct'

const oIDCAuthorizationConfig: OIDCAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.property.oidcIssuerUrl">oidcIssuerUrl</a></code> | <code>string</code> | Url for the OIDC token issuer. |
| <code><a href="#@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.property.oidcProviderName">oidcProviderName</a></code> | <code>string</code> | The issuer for the OIDC configuration. |
| <code><a href="#@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.property.tokenExpiryFromAuth">tokenExpiryFromAuth</a></code> | <code>aws-cdk-lib.Duration</code> | The duration an OIDC token is valid after being authenticated by OIDC provider. |
| <code><a href="#@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.property.tokenExpiryFromIssue">tokenExpiryFromIssue</a></code> | <code>aws-cdk-lib.Duration</code> | The duration an OIDC token is valid after being issued to a user. |
| <code><a href="#@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.property.clientId">clientId</a></code> | <code>string</code> | The client identifier of the Relying party at the OpenID identity provider. |

---

##### `oidcIssuerUrl`<sup>Required</sup> <a name="oidcIssuerUrl" id="@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.property.oidcIssuerUrl"></a>

```typescript
public readonly oidcIssuerUrl: string;
```

- *Type:* string

Url for the OIDC token issuer.

---

##### `oidcProviderName`<sup>Required</sup> <a name="oidcProviderName" id="@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.property.oidcProviderName"></a>

```typescript
public readonly oidcProviderName: string;
```

- *Type:* string

The issuer for the OIDC configuration.

---

##### `tokenExpiryFromAuth`<sup>Required</sup> <a name="tokenExpiryFromAuth" id="@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.property.tokenExpiryFromAuth"></a>

```typescript
public readonly tokenExpiryFromAuth: Duration;
```

- *Type:* aws-cdk-lib.Duration

The duration an OIDC token is valid after being authenticated by OIDC provider.

auth_time claim in OIDC token is required for this validation to work.

---

##### `tokenExpiryFromIssue`<sup>Required</sup> <a name="tokenExpiryFromIssue" id="@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.property.tokenExpiryFromIssue"></a>

```typescript
public readonly tokenExpiryFromIssue: Duration;
```

- *Type:* aws-cdk-lib.Duration

The duration an OIDC token is valid after being issued to a user.

This validation uses iat claim of OIDC token.

---

##### `clientId`<sup>Optional</sup> <a name="clientId" id="@aws-amplify/graphql-api-construct.OIDCAuthorizationConfig.property.clientId"></a>

```typescript
public readonly clientId: string;
```

- *Type:* string

The client identifier of the Relying party at the OpenID identity provider.

A regular expression can be specified so AppSync can validate against multiple client identifiers at a time. Example

---

### OptimisticConflictResolutionStrategy <a name="OptimisticConflictResolutionStrategy" id="@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy"></a>

Enable automerge on the project.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy.Initializer"></a>

```typescript
import { OptimisticConflictResolutionStrategy } from '@aws-amplify/graphql-api-construct'

const optimisticConflictResolutionStrategy: OptimisticConflictResolutionStrategy = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy.property.detectionType">detectionType</a></code> | <code>string</code> | The conflict detection type used for resolution. |
| <code><a href="#@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy.property.handlerType">handlerType</a></code> | <code>string</code> | This conflict resolution strategy the _version to perform optimistic concurrency. |

---

##### `detectionType`<sup>Required</sup> <a name="detectionType" id="@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy.property.detectionType"></a>

```typescript
public readonly detectionType: string;
```

- *Type:* string

The conflict detection type used for resolution.

---

##### `handlerType`<sup>Required</sup> <a name="handlerType" id="@aws-amplify/graphql-api-construct.OptimisticConflictResolutionStrategy.property.handlerType"></a>

```typescript
public readonly handlerType: string;
```

- *Type:* string

This conflict resolution strategy the _version to perform optimistic concurrency.

For more information, refer to https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html#conflict-detection-and-resolution

---

### PartialTranslationBehavior <a name="PartialTranslationBehavior" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior"></a>

A utility interface equivalent to Partial<TranslationBehavior>.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.Initializer"></a>

```typescript
import { PartialTranslationBehavior } from '@aws-amplify/graphql-api-construct'

const partialTranslationBehavior: PartialTranslationBehavior = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.allowDestructiveGraphqlSchemaUpdates">allowDestructiveGraphqlSchemaUpdates</a></code> | <code>boolean</code> | The following schema updates require replacement of the underlying DynamoDB table:. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.disableResolverDeduping">disableResolverDeduping</a></code> | <code>boolean</code> | Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.enableAutoIndexQueryNames">enableAutoIndexQueryNames</a></code> | <code>boolean</code> | Automate generation of query names, and as a result attaching all indexes as queries to the generated Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.enableSearchNodeToNodeEncryption">enableSearchNodeToNodeEncryption</a></code> | <code>boolean</code> | If enabled, set nodeToNodeEncryption on the searchable domain (if one exists). |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.enableTransformerCfnOutputs">enableTransformerCfnOutputs</a></code> | <code>boolean</code> | When enabled, internal cfn outputs which existed in Amplify-generated apps will continue to be emitted. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.populateOwnerFieldForStaticGroupAuth">populateOwnerFieldForStaticGroupAuth</a></code> | <code>boolean</code> | Ensure that the owner field is still populated even if a static iam or group authorization applies. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.replaceTableUponGsiUpdate">replaceTableUponGsiUpdate</a></code> | <code>boolean</code> | This behavior will only come into effect when both "allowDestructiveGraphqlSchemaUpdates" and this value are set to true. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField">respectPrimaryKeyAttributesOnConnectionField</a></code> | <code>boolean</code> | Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.sandboxModeEnabled">sandboxModeEnabled</a></code> | <code>boolean</code> | Enabling sandbox mode will enable api key auth on all models in the transformed schema. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.secondaryKeyAsGSI">secondaryKeyAsGSI</a></code> | <code>boolean</code> | If disabled, generated. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults">shouldDeepMergeDirectiveConfigDefaults</a></code> | <code>boolean</code> | Restore parity w/ GQLv1. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.suppressApiKeyGeneration">suppressApiKeyGeneration</a></code> | <code>boolean</code> | If enabled, disable api key resource generation even if specified as an auth rule on the construct. |
| <code><a href="#@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.useSubUsernameForDefaultIdentityClaim">useSubUsernameForDefaultIdentityClaim</a></code> | <code>boolean</code> | Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool. |

---

##### `allowDestructiveGraphqlSchemaUpdates`<sup>Optional</sup> <a name="allowDestructiveGraphqlSchemaUpdates" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.allowDestructiveGraphqlSchemaUpdates"></a>

```typescript
public readonly allowDestructiveGraphqlSchemaUpdates: boolean;
```

- *Type:* boolean
- *Default:* false

The following schema updates require replacement of the underlying DynamoDB table:.

Removing or renaming a model
 - Modifying the primary key of a model
 - Modifying a Local Secondary Index of a model (only applies to projects with secondaryKeyAsGSI turned off)

ALL DATA WILL BE LOST when the table replacement happens. When enabled, destructive updates are allowed.
This will only affect DynamoDB tables with provision strategy "AMPLIFY_TABLE".

---

##### `disableResolverDeduping`<sup>Optional</sup> <a name="disableResolverDeduping" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.disableResolverDeduping"></a>

```typescript
public readonly disableResolverDeduping: boolean;
```

- *Type:* boolean
- *Default:* true

Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered.

---

##### `enableAutoIndexQueryNames`<sup>Optional</sup> <a name="enableAutoIndexQueryNames" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.enableAutoIndexQueryNames"></a>

```typescript
public readonly enableAutoIndexQueryNames: boolean;
```

- *Type:* boolean
- *Default:* true

Automate generation of query names, and as a result attaching all indexes as queries to the generated Api.

If enabled,

---

##### `enableSearchNodeToNodeEncryption`<sup>Optional</sup> <a name="enableSearchNodeToNodeEncryption" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.enableSearchNodeToNodeEncryption"></a>

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

##### `enableTransformerCfnOutputs`<sup>Optional</sup> <a name="enableTransformerCfnOutputs" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.enableTransformerCfnOutputs"></a>

```typescript
public readonly enableTransformerCfnOutputs: boolean;
```

- *Type:* boolean
- *Default:* false

When enabled, internal cfn outputs which existed in Amplify-generated apps will continue to be emitted.

---

##### `populateOwnerFieldForStaticGroupAuth`<sup>Optional</sup> <a name="populateOwnerFieldForStaticGroupAuth" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.populateOwnerFieldForStaticGroupAuth"></a>

```typescript
public readonly populateOwnerFieldForStaticGroupAuth: boolean;
```

- *Type:* boolean
- *Default:* true

Ensure that the owner field is still populated even if a static iam or group authorization applies.

---

##### `replaceTableUponGsiUpdate`<sup>Optional</sup> <a name="replaceTableUponGsiUpdate" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.replaceTableUponGsiUpdate"></a>

```typescript
public readonly replaceTableUponGsiUpdate: boolean;
```

- *Type:* boolean
- *Default:* false

This behavior will only come into effect when both "allowDestructiveGraphqlSchemaUpdates" and this value are set to true.

When enabled, any global secondary index update operation will replace the table instead of iterative deployment, which will WIPE ALL
EXISTING DATA but cost much less time for deployment This will only affect DynamoDB tables with provision strategy "AMPLIFY_TABLE".

---

##### `respectPrimaryKeyAttributesOnConnectionField`<sup>Optional</sup> <a name="respectPrimaryKeyAttributesOnConnectionField" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField"></a>

```typescript
public readonly respectPrimaryKeyAttributesOnConnectionField: boolean;
```

- *Type:* boolean
- *Default:* true

Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.

---

##### `sandboxModeEnabled`<sup>Optional</sup> <a name="sandboxModeEnabled" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.sandboxModeEnabled"></a>

```typescript
public readonly sandboxModeEnabled: boolean;
```

- *Type:* boolean
- *Default:* false

Enabling sandbox mode will enable api key auth on all models in the transformed schema.

---

##### `secondaryKeyAsGSI`<sup>Optional</sup> <a name="secondaryKeyAsGSI" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.secondaryKeyAsGSI"></a>

```typescript
public readonly secondaryKeyAsGSI: boolean;
```

- *Type:* boolean
- *Default:* true

If disabled, generated.

---

##### `shouldDeepMergeDirectiveConfigDefaults`<sup>Optional</sup> <a name="shouldDeepMergeDirectiveConfigDefaults" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults"></a>

```typescript
public readonly shouldDeepMergeDirectiveConfigDefaults: boolean;
```

- *Type:* boolean
- *Default:* true

Restore parity w/ GQLv1.

---

##### `suppressApiKeyGeneration`<sup>Optional</sup> <a name="suppressApiKeyGeneration" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.suppressApiKeyGeneration"></a>

```typescript
public readonly suppressApiKeyGeneration: boolean;
```

- *Type:* boolean
- *Default:* false

If enabled, disable api key resource generation even if specified as an auth rule on the construct.

This is a legacy parameter from the Graphql Transformer existing in Amplify CLI, not recommended to change.

---

##### `useSubUsernameForDefaultIdentityClaim`<sup>Optional</sup> <a name="useSubUsernameForDefaultIdentityClaim" id="@aws-amplify/graphql-api-construct.PartialTranslationBehavior.property.useSubUsernameForDefaultIdentityClaim"></a>

```typescript
public readonly useSubUsernameForDefaultIdentityClaim: boolean;
```

- *Type:* boolean
- *Default:* true

Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool.

---

### ProvisionedConcurrencyConfig <a name="ProvisionedConcurrencyConfig" id="@aws-amplify/graphql-api-construct.ProvisionedConcurrencyConfig"></a>

The configuration for the provisioned concurrency of the Lambda.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.ProvisionedConcurrencyConfig.Initializer"></a>

```typescript
import { ProvisionedConcurrencyConfig } from '@aws-amplify/graphql-api-construct'

const provisionedConcurrencyConfig: ProvisionedConcurrencyConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.ProvisionedConcurrencyConfig.property.provisionedConcurrentExecutions">provisionedConcurrentExecutions</a></code> | <code>number</code> | The amount of provisioned concurrency to allocate. |

---

##### `provisionedConcurrentExecutions`<sup>Required</sup> <a name="provisionedConcurrentExecutions" id="@aws-amplify/graphql-api-construct.ProvisionedConcurrencyConfig.property.provisionedConcurrentExecutions"></a>

```typescript
public readonly provisionedConcurrentExecutions: number;
```

- *Type:* number

The amount of provisioned concurrency to allocate.

*

---

### ProvisionedThroughput <a name="ProvisionedThroughput" id="@aws-amplify/graphql-api-construct.ProvisionedThroughput"></a>

Wrapper for provisioned throughput config in DDB.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.ProvisionedThroughput.Initializer"></a>

```typescript
import { ProvisionedThroughput } from '@aws-amplify/graphql-api-construct'

const provisionedThroughput: ProvisionedThroughput = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.ProvisionedThroughput.property.readCapacityUnits">readCapacityUnits</a></code> | <code>number</code> | The read capacity units on the table or index. |
| <code><a href="#@aws-amplify/graphql-api-construct.ProvisionedThroughput.property.writeCapacityUnits">writeCapacityUnits</a></code> | <code>number</code> | The write capacity units on the table or index. |

---

##### `readCapacityUnits`<sup>Required</sup> <a name="readCapacityUnits" id="@aws-amplify/graphql-api-construct.ProvisionedThroughput.property.readCapacityUnits"></a>

```typescript
public readonly readCapacityUnits: number;
```

- *Type:* number

The read capacity units on the table or index.

---

##### `writeCapacityUnits`<sup>Required</sup> <a name="writeCapacityUnits" id="@aws-amplify/graphql-api-construct.ProvisionedThroughput.property.writeCapacityUnits"></a>

```typescript
public readonly writeCapacityUnits: number;
```

- *Type:* number

The write capacity units on the table or index.

---

### QueryFunctionSlot <a name="QueryFunctionSlot" id="@aws-amplify/graphql-api-construct.QueryFunctionSlot"></a>

Slot types for Query Resolvers.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.QueryFunctionSlot.Initializer"></a>

```typescript
import { QueryFunctionSlot } from '@aws-amplify/graphql-api-construct'

const queryFunctionSlot: QueryFunctionSlot = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the Api definition. |
| <code><a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |
| <code><a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot.property.slotName">slotName</a></code> | <code>string</code> | The slot name to inject this behavior into. |
| <code><a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot.property.typeName">typeName</a></code> | <code>string</code> | This slot type applies to the Query type on the Api definition. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-api-construct.QueryFunctionSlot.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the Api definition.

---

##### `function`<sup>Required</sup> <a name="function" id="@aws-amplify/graphql-api-construct.QueryFunctionSlot.property.function"></a>

```typescript
public readonly function: FunctionSlotOverride;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.FunctionSlotOverride">FunctionSlotOverride</a>

The overridden behavior for this slot.

---

##### `slotIndex`<sup>Required</sup> <a name="slotIndex" id="@aws-amplify/graphql-api-construct.QueryFunctionSlot.property.slotIndex"></a>

```typescript
public readonly slotIndex: number;
```

- *Type:* number

The slot index to use to inject this into the execution pipeline.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `slotName`<sup>Required</sup> <a name="slotName" id="@aws-amplify/graphql-api-construct.QueryFunctionSlot.property.slotName"></a>

```typescript
public readonly slotName: string;
```

- *Type:* string

The slot name to inject this behavior into.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `typeName`<sup>Required</sup> <a name="typeName" id="@aws-amplify/graphql-api-construct.QueryFunctionSlot.property.typeName"></a>

```typescript
public readonly typeName: string;
```

- *Type:* string

This slot type applies to the Query type on the Api definition.

---

### SQLLambdaModelDataSourceStrategy <a name="SQLLambdaModelDataSourceStrategy" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy"></a>

A strategy that creates a Lambda to connect to a pre-existing SQL table to resolve model data.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.Initializer"></a>

```typescript
import { SQLLambdaModelDataSourceStrategy } from '@aws-amplify/graphql-api-construct'

const sQLLambdaModelDataSourceStrategy: SQLLambdaModelDataSourceStrategy = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.dbConnectionConfig">dbConnectionConfig</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig">SqlModelDataSourceSecretsManagerDbConnectionConfig</a> \| <a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig">SqlModelDataSourceSsmDbConnectionConfig</a></code> | The parameters the Lambda data source will use to connect to the database. |
| <code><a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.dbType">dbType</a></code> | <code>string</code> | The type of the SQL database used to process model operations for this definition. |
| <code><a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.name">name</a></code> | <code>string</code> | The name of the strategy. |
| <code><a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.customSqlStatements">customSqlStatements</a></code> | <code>{[ key: string ]: string}</code> | Custom SQL statements. |
| <code><a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.sqlLambdaProvisionedConcurrencyConfig">sqlLambdaProvisionedConcurrencyConfig</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.ProvisionedConcurrencyConfig">ProvisionedConcurrencyConfig</a></code> | The configuration for the provisioned concurrency of the Lambda. |
| <code><a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.vpcConfiguration">vpcConfiguration</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.VpcConfig">VpcConfig</a></code> | The configuration of the VPC into which to install the Lambda. |

---

##### `dbConnectionConfig`<sup>Required</sup> <a name="dbConnectionConfig" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.dbConnectionConfig"></a>

```typescript
public readonly dbConnectionConfig: SqlModelDataSourceSecretsManagerDbConnectionConfig | SqlModelDataSourceSsmDbConnectionConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig">SqlModelDataSourceSecretsManagerDbConnectionConfig</a> | <a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig">SqlModelDataSourceSsmDbConnectionConfig</a>

The parameters the Lambda data source will use to connect to the database.

---

##### `dbType`<sup>Required</sup> <a name="dbType" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.dbType"></a>

```typescript
public readonly dbType: string;
```

- *Type:* string

The type of the SQL database used to process model operations for this definition.

---

##### `name`<sup>Required</sup> <a name="name" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.name"></a>

```typescript
public readonly name: string;
```

- *Type:* string

The name of the strategy.

This will be used to name the AppSync DataSource itself, plus any associated resources like resolver Lambdas.
This name must be unique across all schema definitions in a GraphQL API.

---

##### `customSqlStatements`<sup>Optional</sup> <a name="customSqlStatements" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.customSqlStatements"></a>

```typescript
public readonly customSqlStatements: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}

Custom SQL statements.

The key is the value of the `references` attribute of the `@sql` directive in the `schema`; the value is the SQL
to be executed.

---

##### `sqlLambdaProvisionedConcurrencyConfig`<sup>Optional</sup> <a name="sqlLambdaProvisionedConcurrencyConfig" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.sqlLambdaProvisionedConcurrencyConfig"></a>

```typescript
public readonly sqlLambdaProvisionedConcurrencyConfig: ProvisionedConcurrencyConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.ProvisionedConcurrencyConfig">ProvisionedConcurrencyConfig</a>

The configuration for the provisioned concurrency of the Lambda.

---

##### `vpcConfiguration`<sup>Optional</sup> <a name="vpcConfiguration" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy.property.vpcConfiguration"></a>

```typescript
public readonly vpcConfiguration: VpcConfig;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.VpcConfig">VpcConfig</a>

The configuration of the VPC into which to install the Lambda.

---

### SqlModelDataSourceSecretsManagerDbConnectionConfig <a name="SqlModelDataSourceSecretsManagerDbConnectionConfig" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig"></a>

The credentials stored in Secrets Manager that the lambda data source will use to connect to the database.

The managed secret should be in the same region as the lambda.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.Initializer"></a>

```typescript
import { SqlModelDataSourceSecretsManagerDbConnectionConfig } from '@aws-amplify/graphql-api-construct'

const sqlModelDataSourceSecretsManagerDbConnectionConfig: SqlModelDataSourceSecretsManagerDbConnectionConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.property.databaseName">databaseName</a></code> | <code>string</code> | The database name. |
| <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.property.hostname">hostname</a></code> | <code>string</code> | The hostame of the database. |
| <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.property.port">port</a></code> | <code>number</code> | The port number of the database proxy, cluster, or instance. |
| <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.property.secretArn">secretArn</a></code> | <code>string</code> | The ARN of the managed secret with username, password, and hostname to use when connecting to the database. |
| <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.property.keyArn">keyArn</a></code> | <code>string</code> | The ARN of the customer managed encryption key for the secret. |

---

##### `databaseName`<sup>Required</sup> <a name="databaseName" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.property.databaseName"></a>

```typescript
public readonly databaseName: string;
```

- *Type:* string

The database name.

---

##### `hostname`<sup>Required</sup> <a name="hostname" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.property.hostname"></a>

```typescript
public readonly hostname: string;
```

- *Type:* string

The hostame of the database.

---

##### `port`<sup>Required</sup> <a name="port" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.property.port"></a>

```typescript
public readonly port: number;
```

- *Type:* number

The port number of the database proxy, cluster, or instance.

---

##### `secretArn`<sup>Required</sup> <a name="secretArn" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.property.secretArn"></a>

```typescript
public readonly secretArn: string;
```

- *Type:* string

The ARN of the managed secret with username, password, and hostname to use when connecting to the database.

*

---

##### `keyArn`<sup>Optional</sup> <a name="keyArn" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSecretsManagerDbConnectionConfig.property.keyArn"></a>

```typescript
public readonly keyArn: string;
```

- *Type:* string

The ARN of the customer managed encryption key for the secret.

If not supplied, the secret is expected to be encrypted with the default AWS-managed key. *

---

### SqlModelDataSourceSsmDbConnectionConfig <a name="SqlModelDataSourceSsmDbConnectionConfig" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig"></a>

The Secure Systems Manager parameter paths the Lambda data source will use to connect to the database.

These parameters are retrieved from Secure Systems Manager in the same region as the Lambda.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.Initializer"></a>

```typescript
import { SqlModelDataSourceSsmDbConnectionConfig } from '@aws-amplify/graphql-api-construct'

const sqlModelDataSourceSsmDbConnectionConfig: SqlModelDataSourceSsmDbConnectionConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.property.databaseNameSsmPath">databaseNameSsmPath</a></code> | <code>string</code> | The Secure Systems Manager parameter containing the database name. |
| <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.property.hostnameSsmPath">hostnameSsmPath</a></code> | <code>string</code> | The Secure Systems Manager parameter containing the hostname of the database. |
| <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.property.passwordSsmPath">passwordSsmPath</a></code> | <code>string</code> | The Secure Systems Manager parameter containing the password to use when connecting to the database. |
| <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.property.portSsmPath">portSsmPath</a></code> | <code>string</code> | The Secure Systems Manager parameter containing the port number of the database proxy, cluster, or instance. |
| <code><a href="#@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.property.usernameSsmPath">usernameSsmPath</a></code> | <code>string</code> | The Secure Systems Manager parameter containing the username to use when connecting to the database. |

---

##### `databaseNameSsmPath`<sup>Required</sup> <a name="databaseNameSsmPath" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.property.databaseNameSsmPath"></a>

```typescript
public readonly databaseNameSsmPath: string;
```

- *Type:* string

The Secure Systems Manager parameter containing the database name.

---

##### `hostnameSsmPath`<sup>Required</sup> <a name="hostnameSsmPath" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.property.hostnameSsmPath"></a>

```typescript
public readonly hostnameSsmPath: string;
```

- *Type:* string

The Secure Systems Manager parameter containing the hostname of the database.

For RDS-based SQL data sources, this can be the hostname
of a database proxy, cluster, or instance.

---

##### `passwordSsmPath`<sup>Required</sup> <a name="passwordSsmPath" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.property.passwordSsmPath"></a>

```typescript
public readonly passwordSsmPath: string;
```

- *Type:* string

The Secure Systems Manager parameter containing the password to use when connecting to the database.

---

##### `portSsmPath`<sup>Required</sup> <a name="portSsmPath" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.property.portSsmPath"></a>

```typescript
public readonly portSsmPath: string;
```

- *Type:* string

The Secure Systems Manager parameter containing the port number of the database proxy, cluster, or instance.

---

##### `usernameSsmPath`<sup>Required</sup> <a name="usernameSsmPath" id="@aws-amplify/graphql-api-construct.SqlModelDataSourceSsmDbConnectionConfig.property.usernameSsmPath"></a>

```typescript
public readonly usernameSsmPath: string;
```

- *Type:* string

The Secure Systems Manager parameter containing the username to use when connecting to the database.

---

### SSESpecification <a name="SSESpecification" id="@aws-amplify/graphql-api-construct.SSESpecification"></a>

Represents the settings used to enable server-side encryption.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.SSESpecification.Initializer"></a>

```typescript
import { SSESpecification } from '@aws-amplify/graphql-api-construct'

const sSESpecification: SSESpecification = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.SSESpecification.property.sseEnabled">sseEnabled</a></code> | <code>boolean</code> | Indicates whether server-side encryption is done using an AWS managed key or an AWS owned key. |
| <code><a href="#@aws-amplify/graphql-api-construct.SSESpecification.property.kmsMasterKeyId">kmsMasterKeyId</a></code> | <code>string</code> | The AWS KMS key that should be used for the AWS KMS encryption. |
| <code><a href="#@aws-amplify/graphql-api-construct.SSESpecification.property.sseType">sseType</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.SSEType">SSEType</a></code> | Server-side encryption type. |

---

##### `sseEnabled`<sup>Required</sup> <a name="sseEnabled" id="@aws-amplify/graphql-api-construct.SSESpecification.property.sseEnabled"></a>

```typescript
public readonly sseEnabled: boolean;
```

- *Type:* boolean

Indicates whether server-side encryption is done using an AWS managed key or an AWS owned key.

If enabled (true), server-side encryption type is set to `KMS` and an AWS managed key is used ( AWS KMS charges apply).
If disabled (false) or not specified, server-side encryption is set to AWS owned key.

---

##### `kmsMasterKeyId`<sup>Optional</sup> <a name="kmsMasterKeyId" id="@aws-amplify/graphql-api-construct.SSESpecification.property.kmsMasterKeyId"></a>

```typescript
public readonly kmsMasterKeyId: string;
```

- *Type:* string

The AWS KMS key that should be used for the AWS KMS encryption.

To specify a key, use its key ID, Amazon Resource Name (ARN), alias name, or alias ARN. Note that you should only provide
this parameter if the key is different from the default DynamoDB key `alias/aws/dynamodb` .

---

##### `sseType`<sup>Optional</sup> <a name="sseType" id="@aws-amplify/graphql-api-construct.SSESpecification.property.sseType"></a>

```typescript
public readonly sseType: SSEType;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.SSEType">SSEType</a>

Server-side encryption type.

The only supported value is:
`KMS` Server-side encryption that uses AWS Key Management Service.
  The key is stored in your account and is managed by AWS KMS ( AWS KMS charges apply).

---

### StreamSpecification <a name="StreamSpecification" id="@aws-amplify/graphql-api-construct.StreamSpecification"></a>

Represents the DynamoDB Streams configuration for a table in DynamoDB.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.StreamSpecification.Initializer"></a>

```typescript
import { StreamSpecification } from '@aws-amplify/graphql-api-construct'

const streamSpecification: StreamSpecification = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.StreamSpecification.property.streamViewType">streamViewType</a></code> | <code>aws-cdk-lib.aws_dynamodb.StreamViewType</code> | When an item in the table is modified, `StreamViewType` determines what information is written to the stream for this table. |

---

##### `streamViewType`<sup>Required</sup> <a name="streamViewType" id="@aws-amplify/graphql-api-construct.StreamSpecification.property.streamViewType"></a>

```typescript
public readonly streamViewType: StreamViewType;
```

- *Type:* aws-cdk-lib.aws_dynamodb.StreamViewType

When an item in the table is modified, `StreamViewType` determines what information is written to the stream for this table.

Valid values for `StreamViewType` are:
- `KEYS_ONLY` - Only the key attributes of the modified item are written to the stream.
- `NEW_IMAGE` - The entire item, as it appears after it was modified, is written to the stream.
- `OLD_IMAGE` - The entire item, as it appeared before it was modified, is written to the stream.
- `NEW_AND_OLD_IMAGES` - Both the new and the old item images of the item are written to the stream.

---

### SubnetAvailabilityZone <a name="SubnetAvailabilityZone" id="@aws-amplify/graphql-api-construct.SubnetAvailabilityZone"></a>

Subnet configuration for VPC endpoints used by a Lambda resolver for a SQL-based data source.

Although it is possible to create multiple
subnets in a single availability zone, VPC service endpoints may only be deployed to a single subnet in a given availability zone. This
structure ensures that the Lambda function and VPC service endpoints are mutually consistent.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.SubnetAvailabilityZone.Initializer"></a>

```typescript
import { SubnetAvailabilityZone } from '@aws-amplify/graphql-api-construct'

const subnetAvailabilityZone: SubnetAvailabilityZone = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.SubnetAvailabilityZone.property.availabilityZone">availabilityZone</a></code> | <code>string</code> | The availability zone of the subnet. |
| <code><a href="#@aws-amplify/graphql-api-construct.SubnetAvailabilityZone.property.subnetId">subnetId</a></code> | <code>string</code> | The subnet ID to install the Lambda data source in. |

---

##### `availabilityZone`<sup>Required</sup> <a name="availabilityZone" id="@aws-amplify/graphql-api-construct.SubnetAvailabilityZone.property.availabilityZone"></a>

```typescript
public readonly availabilityZone: string;
```

- *Type:* string

The availability zone of the subnet.

---

##### `subnetId`<sup>Required</sup> <a name="subnetId" id="@aws-amplify/graphql-api-construct.SubnetAvailabilityZone.property.subnetId"></a>

```typescript
public readonly subnetId: string;
```

- *Type:* string

The subnet ID to install the Lambda data source in.

---

### SubscriptionFunctionSlot <a name="SubscriptionFunctionSlot" id="@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot"></a>

Slot types for Subscription Resolvers.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.Initializer"></a>

```typescript
import { SubscriptionFunctionSlot } from '@aws-amplify/graphql-api-construct'

const subscriptionFunctionSlot: SubscriptionFunctionSlot = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.property.fieldName">fieldName</a></code> | <code>string</code> | The field to attach this function to on the Api definition. |
| <code><a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.property.function">function</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.FunctionSlotOverride">FunctionSlotOverride</a></code> | The overridden behavior for this slot. |
| <code><a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.property.slotIndex">slotIndex</a></code> | <code>number</code> | The slot index to use to inject this into the execution pipeline. |
| <code><a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.property.slotName">slotName</a></code> | <code>string</code> | The slot name to inject this behavior into. |
| <code><a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.property.typeName">typeName</a></code> | <code>string</code> | This slot type applies to the Subscription type on the Api definition. |

---

##### `fieldName`<sup>Required</sup> <a name="fieldName" id="@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.property.fieldName"></a>

```typescript
public readonly fieldName: string;
```

- *Type:* string

The field to attach this function to on the Api definition.

---

##### `function`<sup>Required</sup> <a name="function" id="@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.property.function"></a>

```typescript
public readonly function: FunctionSlotOverride;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.FunctionSlotOverride">FunctionSlotOverride</a>

The overridden behavior for this slot.

---

##### `slotIndex`<sup>Required</sup> <a name="slotIndex" id="@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.property.slotIndex"></a>

```typescript
public readonly slotIndex: number;
```

- *Type:* number

The slot index to use to inject this into the execution pipeline.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `slotName`<sup>Required</sup> <a name="slotName" id="@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.property.slotName"></a>

```typescript
public readonly slotName: string;
```

- *Type:* string

The slot name to inject this behavior into.

For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers

---

##### `typeName`<sup>Required</sup> <a name="typeName" id="@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot.property.typeName"></a>

```typescript
public readonly typeName: string;
```

- *Type:* string

This slot type applies to the Subscription type on the Api definition.

---

### TimeToLiveSpecification <a name="TimeToLiveSpecification" id="@aws-amplify/graphql-api-construct.TimeToLiveSpecification"></a>

Shape for TTL config.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.TimeToLiveSpecification.Initializer"></a>

```typescript
import { TimeToLiveSpecification } from '@aws-amplify/graphql-api-construct'

const timeToLiveSpecification: TimeToLiveSpecification = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.TimeToLiveSpecification.property.enabled">enabled</a></code> | <code>boolean</code> | Boolean determining if the ttl is enabled or not. |
| <code><a href="#@aws-amplify/graphql-api-construct.TimeToLiveSpecification.property.attributeName">attributeName</a></code> | <code>string</code> | Attribute name to apply to the ttl spec. |

---

##### `enabled`<sup>Required</sup> <a name="enabled" id="@aws-amplify/graphql-api-construct.TimeToLiveSpecification.property.enabled"></a>

```typescript
public readonly enabled: boolean;
```

- *Type:* boolean

Boolean determining if the ttl is enabled or not.

---

##### `attributeName`<sup>Optional</sup> <a name="attributeName" id="@aws-amplify/graphql-api-construct.TimeToLiveSpecification.property.attributeName"></a>

```typescript
public readonly attributeName: string;
```

- *Type:* string

Attribute name to apply to the ttl spec.

---

### TranslationBehavior <a name="TranslationBehavior" id="@aws-amplify/graphql-api-construct.TranslationBehavior"></a>

Strongly typed set of shared parameters for all transformers, and core layer.

This is intended to replace feature flags, to ensure param coercion happens in
a single location, and isn't spread around the transformers, where they can
have different default behaviors.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.TranslationBehavior.Initializer"></a>

```typescript
import { TranslationBehavior } from '@aws-amplify/graphql-api-construct'

const translationBehavior: TranslationBehavior = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.allowDestructiveGraphqlSchemaUpdates">allowDestructiveGraphqlSchemaUpdates</a></code> | <code>boolean</code> | The following schema updates require replacement of the underlying DynamoDB table:. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.disableResolverDeduping">disableResolverDeduping</a></code> | <code>boolean</code> | Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.enableAutoIndexQueryNames">enableAutoIndexQueryNames</a></code> | <code>boolean</code> | Automate generation of query names, and as a result attaching all indexes as queries to the generated Api. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.enableSearchNodeToNodeEncryption">enableSearchNodeToNodeEncryption</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.enableTransformerCfnOutputs">enableTransformerCfnOutputs</a></code> | <code>boolean</code> | When enabled, internal cfn outputs which existed in Amplify-generated apps will continue to be emitted. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.populateOwnerFieldForStaticGroupAuth">populateOwnerFieldForStaticGroupAuth</a></code> | <code>boolean</code> | Ensure that the owner field is still populated even if a static iam or group authorization applies. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.replaceTableUponGsiUpdate">replaceTableUponGsiUpdate</a></code> | <code>boolean</code> | This behavior will only come into effect when both "allowDestructiveGraphqlSchemaUpdates" and this value are set to true. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField">respectPrimaryKeyAttributesOnConnectionField</a></code> | <code>boolean</code> | Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.sandboxModeEnabled">sandboxModeEnabled</a></code> | <code>boolean</code> | Enabling sandbox mode will enable api key auth on all models in the transformed schema. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.secondaryKeyAsGSI">secondaryKeyAsGSI</a></code> | <code>boolean</code> | If disabled, generated. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults">shouldDeepMergeDirectiveConfigDefaults</a></code> | <code>boolean</code> | Restore parity w/ GQLv1. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.suppressApiKeyGeneration">suppressApiKeyGeneration</a></code> | <code>boolean</code> | If enabled, disable api key resource generation even if specified as an auth rule on the construct. |
| <code><a href="#@aws-amplify/graphql-api-construct.TranslationBehavior.property.useSubUsernameForDefaultIdentityClaim">useSubUsernameForDefaultIdentityClaim</a></code> | <code>boolean</code> | Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool. |

---

##### `allowDestructiveGraphqlSchemaUpdates`<sup>Required</sup> <a name="allowDestructiveGraphqlSchemaUpdates" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.allowDestructiveGraphqlSchemaUpdates"></a>

```typescript
public readonly allowDestructiveGraphqlSchemaUpdates: boolean;
```

- *Type:* boolean
- *Default:* false

The following schema updates require replacement of the underlying DynamoDB table:.

Removing or renaming a model
 - Modifying the primary key of a model
 - Modifying a Local Secondary Index of a model (only applies to projects with secondaryKeyAsGSI turned off)

ALL DATA WILL BE LOST when the table replacement happens. When enabled, destructive updates are allowed.
This will only affect DynamoDB tables with provision strategy "AMPLIFY_TABLE".

---

##### `disableResolverDeduping`<sup>Required</sup> <a name="disableResolverDeduping" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.disableResolverDeduping"></a>

```typescript
public readonly disableResolverDeduping: boolean;
```

- *Type:* boolean
- *Default:* true

Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can lead to circular dependencies across stacks if models are reordered.

---

##### `enableAutoIndexQueryNames`<sup>Required</sup> <a name="enableAutoIndexQueryNames" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.enableAutoIndexQueryNames"></a>

```typescript
public readonly enableAutoIndexQueryNames: boolean;
```

- *Type:* boolean
- *Default:* true

Automate generation of query names, and as a result attaching all indexes as queries to the generated Api.

If enabled,

---

##### `enableSearchNodeToNodeEncryption`<sup>Required</sup> <a name="enableSearchNodeToNodeEncryption" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.enableSearchNodeToNodeEncryption"></a>

```typescript
public readonly enableSearchNodeToNodeEncryption: boolean;
```

- *Type:* boolean

---

##### `enableTransformerCfnOutputs`<sup>Required</sup> <a name="enableTransformerCfnOutputs" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.enableTransformerCfnOutputs"></a>

```typescript
public readonly enableTransformerCfnOutputs: boolean;
```

- *Type:* boolean
- *Default:* false

When enabled, internal cfn outputs which existed in Amplify-generated apps will continue to be emitted.

---

##### `populateOwnerFieldForStaticGroupAuth`<sup>Required</sup> <a name="populateOwnerFieldForStaticGroupAuth" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.populateOwnerFieldForStaticGroupAuth"></a>

```typescript
public readonly populateOwnerFieldForStaticGroupAuth: boolean;
```

- *Type:* boolean
- *Default:* true

Ensure that the owner field is still populated even if a static iam or group authorization applies.

---

##### `replaceTableUponGsiUpdate`<sup>Required</sup> <a name="replaceTableUponGsiUpdate" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.replaceTableUponGsiUpdate"></a>

```typescript
public readonly replaceTableUponGsiUpdate: boolean;
```

- *Type:* boolean
- *Default:* false

This behavior will only come into effect when both "allowDestructiveGraphqlSchemaUpdates" and this value are set to true.

When enabled, any GSI update operation will replace the table instead of iterative deployment, which will WIPE ALL EXISTING DATA but
cost much less time for deployment This will only affect DynamoDB tables with provision strategy "AMPLIFY_TABLE".

---

##### `respectPrimaryKeyAttributesOnConnectionField`<sup>Required</sup> <a name="respectPrimaryKeyAttributesOnConnectionField" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.respectPrimaryKeyAttributesOnConnectionField"></a>

```typescript
public readonly respectPrimaryKeyAttributesOnConnectionField: boolean;
```

- *Type:* boolean
- *Default:* true

Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.

---

##### `sandboxModeEnabled`<sup>Required</sup> <a name="sandboxModeEnabled" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.sandboxModeEnabled"></a>

```typescript
public readonly sandboxModeEnabled: boolean;
```

- *Type:* boolean
- *Default:* false

Enabling sandbox mode will enable api key auth on all models in the transformed schema.

---

##### `secondaryKeyAsGSI`<sup>Required</sup> <a name="secondaryKeyAsGSI" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.secondaryKeyAsGSI"></a>

```typescript
public readonly secondaryKeyAsGSI: boolean;
```

- *Type:* boolean
- *Default:* true

If disabled, generated.

---

##### `shouldDeepMergeDirectiveConfigDefaults`<sup>Required</sup> <a name="shouldDeepMergeDirectiveConfigDefaults" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.shouldDeepMergeDirectiveConfigDefaults"></a>

```typescript
public readonly shouldDeepMergeDirectiveConfigDefaults: boolean;
```

- *Type:* boolean
- *Default:* true

Restore parity w/ GQLv1.

---

##### `suppressApiKeyGeneration`<sup>Required</sup> <a name="suppressApiKeyGeneration" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.suppressApiKeyGeneration"></a>

```typescript
public readonly suppressApiKeyGeneration: boolean;
```

- *Type:* boolean
- *Default:* false

If enabled, disable api key resource generation even if specified as an auth rule on the construct.

This is a legacy parameter from the Graphql Transformer existing in Amplify CLI, not recommended to change.

---

##### `useSubUsernameForDefaultIdentityClaim`<sup>Required</sup> <a name="useSubUsernameForDefaultIdentityClaim" id="@aws-amplify/graphql-api-construct.TranslationBehavior.property.useSubUsernameForDefaultIdentityClaim"></a>

```typescript
public readonly useSubUsernameForDefaultIdentityClaim: boolean;
```

- *Type:* boolean
- *Default:* true

Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same id to access data from a deleted user in the pool.

---

### UserPoolAuthorizationConfig <a name="UserPoolAuthorizationConfig" id="@aws-amplify/graphql-api-construct.UserPoolAuthorizationConfig"></a>

Configuration for Cognito UserPool Authorization on the Graphql Api.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.UserPoolAuthorizationConfig.Initializer"></a>

```typescript
import { UserPoolAuthorizationConfig } from '@aws-amplify/graphql-api-construct'

const userPoolAuthorizationConfig: UserPoolAuthorizationConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.UserPoolAuthorizationConfig.property.userPool">userPool</a></code> | <code>aws-cdk-lib.aws_cognito.IUserPool</code> | The Cognito User Pool which is used to authenticated JWT tokens, and vends group and user information. |

---

##### `userPool`<sup>Required</sup> <a name="userPool" id="@aws-amplify/graphql-api-construct.UserPoolAuthorizationConfig.property.userPool"></a>

```typescript
public readonly userPool: IUserPool;
```

- *Type:* aws-cdk-lib.aws_cognito.IUserPool

The Cognito User Pool which is used to authenticated JWT tokens, and vends group and user information.

---

### VpcConfig <a name="VpcConfig" id="@aws-amplify/graphql-api-construct.VpcConfig"></a>

Configuration of the VPC in which to install a Lambda to resolve queries against a SQL-based data source.

The SQL Lambda will be deployed
into the specified VPC, subnets, and security groups. The specified subnets and security groups must be in the same VPC. The VPC must
have at least one subnet. The construct will also create VPC service endpoints in the specified subnets, as well as inbound security
rules, to allow traffic on port 443 within each security group. This allows the Lambda to read database connection information from
Secure Systems Manager.

#### Initializer <a name="Initializer" id="@aws-amplify/graphql-api-construct.VpcConfig.Initializer"></a>

```typescript
import { VpcConfig } from '@aws-amplify/graphql-api-construct'

const vpcConfig: VpcConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.VpcConfig.property.securityGroupIds">securityGroupIds</a></code> | <code>string[]</code> | The security groups to install the Lambda data source in. |
| <code><a href="#@aws-amplify/graphql-api-construct.VpcConfig.property.subnetAvailabilityZoneConfig">subnetAvailabilityZoneConfig</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.SubnetAvailabilityZone">SubnetAvailabilityZone</a>[]</code> | The subnets to install the Lambda data source in, one per availability zone. |
| <code><a href="#@aws-amplify/graphql-api-construct.VpcConfig.property.vpcId">vpcId</a></code> | <code>string</code> | The VPC to install the Lambda data source in. |

---

##### `securityGroupIds`<sup>Required</sup> <a name="securityGroupIds" id="@aws-amplify/graphql-api-construct.VpcConfig.property.securityGroupIds"></a>

```typescript
public readonly securityGroupIds: string[];
```

- *Type:* string[]

The security groups to install the Lambda data source in.

---

##### `subnetAvailabilityZoneConfig`<sup>Required</sup> <a name="subnetAvailabilityZoneConfig" id="@aws-amplify/graphql-api-construct.VpcConfig.property.subnetAvailabilityZoneConfig"></a>

```typescript
public readonly subnetAvailabilityZoneConfig: SubnetAvailabilityZone[];
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.SubnetAvailabilityZone">SubnetAvailabilityZone</a>[]

The subnets to install the Lambda data source in, one per availability zone.

---

##### `vpcId`<sup>Required</sup> <a name="vpcId" id="@aws-amplify/graphql-api-construct.VpcConfig.property.vpcId"></a>

```typescript
public readonly vpcId: string;
```

- *Type:* string

The VPC to install the Lambda data source in.

---

## Classes <a name="Classes" id="Classes"></a>

### AmplifyDynamoDbTableWrapper <a name="AmplifyDynamoDbTableWrapper" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper"></a>

Wrapper class around Custom::AmplifyDynamoDBTable custom resource, to simplify the override experience a bit.

This is NOT a construct, just an easier way to access
the generated construct.
This is a wrapper intended to mimic the `aws_cdk_lib.aws_dynamodb.Table` functionality more-or-less.
Notable differences is the addition of TKTK properties, to account for the fact that they're constructor props
in the CDK construct, as well as the removal of all from*, grant*, and metric* methods implemented by Table.

#### Initializers <a name="Initializers" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.Initializer"></a>

```typescript
import { AmplifyDynamoDbTableWrapper } from '@aws-amplify/graphql-api-construct'

new AmplifyDynamoDbTableWrapper(resource: CfnResource)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.Initializer.parameter.resource">resource</a></code> | <code>aws-cdk-lib.CfnResource</code> | the Cfn resource. |

---

##### `resource`<sup>Required</sup> <a name="resource" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.Initializer.parameter.resource"></a>

- *Type:* aws-cdk-lib.CfnResource

the Cfn resource.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.applyRemovalPolicy">applyRemovalPolicy</a></code> | Set the deletion policy of the resource based on the removal policy specified. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.setGlobalSecondaryIndexProvisionedThroughput">setGlobalSecondaryIndexProvisionedThroughput</a></code> | Set the provisionedThroughtput for a specified GSI by name. |

---

##### `applyRemovalPolicy` <a name="applyRemovalPolicy" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.applyRemovalPolicy"></a>

```typescript
public applyRemovalPolicy(policy: RemovalPolicy): void
```

Set the deletion policy of the resource based on the removal policy specified.

###### `policy`<sup>Required</sup> <a name="policy" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.applyRemovalPolicy.parameter.policy"></a>

- *Type:* aws-cdk-lib.RemovalPolicy

removal policy to set.

---

##### `setGlobalSecondaryIndexProvisionedThroughput` <a name="setGlobalSecondaryIndexProvisionedThroughput" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.setGlobalSecondaryIndexProvisionedThroughput"></a>

```typescript
public setGlobalSecondaryIndexProvisionedThroughput(indexName: string, provisionedThroughput: ProvisionedThroughput): void
```

Set the provisionedThroughtput for a specified GSI by name.

###### `indexName`<sup>Required</sup> <a name="indexName" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.setGlobalSecondaryIndexProvisionedThroughput.parameter.indexName"></a>

- *Type:* string

the index to specify a provisionedThroughput config for.

---

###### `provisionedThroughput`<sup>Required</sup> <a name="provisionedThroughput" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.setGlobalSecondaryIndexProvisionedThroughput.parameter.provisionedThroughput"></a>

- *Type:* <a href="#@aws-amplify/graphql-api-construct.ProvisionedThroughput">ProvisionedThroughput</a>

the config to set.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.isAmplifyDynamoDbTableResource">isAmplifyDynamoDbTableResource</a></code> | Return true and perform type narrowing if a given input appears to be capable of. |

---

##### `isAmplifyDynamoDbTableResource` <a name="isAmplifyDynamoDbTableResource" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.isAmplifyDynamoDbTableResource"></a>

```typescript
import { AmplifyDynamoDbTableWrapper } from '@aws-amplify/graphql-api-construct'

AmplifyDynamoDbTableWrapper.isAmplifyDynamoDbTableResource(x: any)
```

Return true and perform type narrowing if a given input appears to be capable of.

###### `x`<sup>Required</sup> <a name="x" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.isAmplifyDynamoDbTableResource.parameter.x"></a>

- *Type:* any

the object to check.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.billingMode">billingMode</a></code> | <code>aws-cdk-lib.aws_dynamodb.BillingMode</code> | Specify how you are charged for read and write throughput and how you manage capacity. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.deletionProtectionEnabled">deletionProtectionEnabled</a></code> | <code>boolean</code> | Set table deletion protection. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.pointInTimeRecoveryEnabled">pointInTimeRecoveryEnabled</a></code> | <code>boolean</code> | Whether point-in-time recovery is enabled. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.provisionedThroughput">provisionedThroughput</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.ProvisionedThroughput">ProvisionedThroughput</a></code> | Update the provisioned throughput for the base table. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.sseSpecification">sseSpecification</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.SSESpecification">SSESpecification</a></code> | Set the ddb server-side encryption specification on the table. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.streamSpecification">streamSpecification</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.StreamSpecification">StreamSpecification</a></code> | Set the ddb stream specification on the table. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.timeToLiveAttribute">timeToLiveAttribute</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.TimeToLiveSpecification">TimeToLiveSpecification</a></code> | The name of TTL attribute. |

---

##### `billingMode`<sup>Required</sup> <a name="billingMode" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.billingMode"></a>

```typescript
public readonly billingMode: BillingMode;
```

- *Type:* aws-cdk-lib.aws_dynamodb.BillingMode

Specify how you are charged for read and write throughput and how you manage capacity.

---

##### `deletionProtectionEnabled`<sup>Required</sup> <a name="deletionProtectionEnabled" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.deletionProtectionEnabled"></a>

```typescript
public readonly deletionProtectionEnabled: boolean;
```

- *Type:* boolean

Set table deletion protection.

---

##### `pointInTimeRecoveryEnabled`<sup>Required</sup> <a name="pointInTimeRecoveryEnabled" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.pointInTimeRecoveryEnabled"></a>

```typescript
public readonly pointInTimeRecoveryEnabled: boolean;
```

- *Type:* boolean

Whether point-in-time recovery is enabled.

---

##### `provisionedThroughput`<sup>Required</sup> <a name="provisionedThroughput" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.provisionedThroughput"></a>

```typescript
public readonly provisionedThroughput: ProvisionedThroughput;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.ProvisionedThroughput">ProvisionedThroughput</a>

Update the provisioned throughput for the base table.

---

##### `sseSpecification`<sup>Required</sup> <a name="sseSpecification" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.sseSpecification"></a>

```typescript
public readonly sseSpecification: SSESpecification;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.SSESpecification">SSESpecification</a>

Set the ddb server-side encryption specification on the table.

---

##### `streamSpecification`<sup>Required</sup> <a name="streamSpecification" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.streamSpecification"></a>

```typescript
public readonly streamSpecification: StreamSpecification;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.StreamSpecification">StreamSpecification</a>

Set the ddb stream specification on the table.

---

##### `timeToLiveAttribute`<sup>Required</sup> <a name="timeToLiveAttribute" id="@aws-amplify/graphql-api-construct.AmplifyDynamoDbTableWrapper.property.timeToLiveAttribute"></a>

```typescript
public readonly timeToLiveAttribute: TimeToLiveSpecification;
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.TimeToLiveSpecification">TimeToLiveSpecification</a>

The name of TTL attribute.

---


### AmplifyGraphqlDefinition <a name="AmplifyGraphqlDefinition" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition"></a>

Class exposing utilities to produce IAmplifyGraphqlDefinition objects given various inputs.

#### Initializers <a name="Initializers" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.Initializer"></a>

```typescript
import { AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct'

new AmplifyGraphqlDefinition()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.combine">combine</a></code> | Combines multiple IAmplifyGraphqlDefinitions into a single definition. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromFiles">fromFiles</a></code> | Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema, binding them to a DynamoDB data source. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromFilesAndStrategy">fromFilesAndStrategy</a></code> | Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema. |
| <code><a href="#@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromString">fromString</a></code> | Produce a schema definition from a string input. |

---

##### `combine` <a name="combine" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.combine"></a>

```typescript
import { AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct'

AmplifyGraphqlDefinition.combine(definitions: IAmplifyGraphqlDefinition[])
```

Combines multiple IAmplifyGraphqlDefinitions into a single definition.

###### `definitions`<sup>Required</sup> <a name="definitions" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.combine.parameter.definitions"></a>

- *Type:* <a href="#@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition">IAmplifyGraphqlDefinition</a>[]

the definitions to combine.

---

##### `fromFiles` <a name="fromFiles" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromFiles"></a>

```typescript
import { AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct'

AmplifyGraphqlDefinition.fromFiles(filePaths: string)
```

Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema, binding them to a DynamoDB data source.

###### `filePaths`<sup>Required</sup> <a name="filePaths" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromFiles.parameter.filePaths"></a>

- *Type:* string

one or more paths to the graphql files to process.

---

##### `fromFilesAndStrategy` <a name="fromFilesAndStrategy" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromFilesAndStrategy"></a>

```typescript
import { AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct'

AmplifyGraphqlDefinition.fromFilesAndStrategy(filePaths: string | string[], dataSourceStrategy?: DefaultDynamoDbModelDataSourceStrategy | AmplifyDynamoDbModelDataSourceStrategy | SQLLambdaModelDataSourceStrategy)
```

Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema.

###### `filePaths`<sup>Required</sup> <a name="filePaths" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromFilesAndStrategy.parameter.filePaths"></a>

- *Type:* string | string[]

one or more paths to the graphql files to process.

---

###### `dataSourceStrategy`<sup>Optional</sup> <a name="dataSourceStrategy" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromFilesAndStrategy.parameter.dataSourceStrategy"></a>

- *Type:* <a href="#@aws-amplify/graphql-api-construct.DefaultDynamoDbModelDataSourceStrategy">DefaultDynamoDbModelDataSourceStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbModelDataSourceStrategy">AmplifyDynamoDbModelDataSourceStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy">SQLLambdaModelDataSourceStrategy</a>

the provisioning definition for datasources that resolve `@model`s in this schema.

The DynamoDB from
CloudFormation will be used by default.

---

##### `fromString` <a name="fromString" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromString"></a>

```typescript
import { AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct'

AmplifyGraphqlDefinition.fromString(schema: string, dataSourceStrategy?: DefaultDynamoDbModelDataSourceStrategy | AmplifyDynamoDbModelDataSourceStrategy | SQLLambdaModelDataSourceStrategy)
```

Produce a schema definition from a string input.

###### `schema`<sup>Required</sup> <a name="schema" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromString.parameter.schema"></a>

- *Type:* string

the graphql input as a string.

---

###### `dataSourceStrategy`<sup>Optional</sup> <a name="dataSourceStrategy" id="@aws-amplify/graphql-api-construct.AmplifyGraphqlDefinition.fromString.parameter.dataSourceStrategy"></a>

- *Type:* <a href="#@aws-amplify/graphql-api-construct.DefaultDynamoDbModelDataSourceStrategy">DefaultDynamoDbModelDataSourceStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbModelDataSourceStrategy">AmplifyDynamoDbModelDataSourceStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy">SQLLambdaModelDataSourceStrategy</a>

the provisioning definition for datasources that resolve `@model`s and custom SQL statements in this schema.

The DynamoDB from CloudFormation will be used by default.

---



### SQLLambdaModelDataSourceStrategyFactory <a name="SQLLambdaModelDataSourceStrategyFactory" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategyFactory"></a>

Class exposing utilities to produce SQLLambdaModelDataSourceStrategy objects given various inputs.

#### Initializers <a name="Initializers" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategyFactory.Initializer"></a>

```typescript
import { SQLLambdaModelDataSourceStrategyFactory } from '@aws-amplify/graphql-api-construct'

new SQLLambdaModelDataSourceStrategyFactory()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategyFactory.fromCustomSqlFiles">fromCustomSqlFiles</a></code> | Creates a SQLLambdaModelDataSourceStrategy where the binding's `customSqlStatements` are populated from `sqlFiles`. |

---

##### `fromCustomSqlFiles` <a name="fromCustomSqlFiles" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategyFactory.fromCustomSqlFiles"></a>

```typescript
import { SQLLambdaModelDataSourceStrategyFactory } from '@aws-amplify/graphql-api-construct'

SQLLambdaModelDataSourceStrategyFactory.fromCustomSqlFiles(sqlFiles: string[], options: SQLLambdaModelDataSourceStrategy)
```

Creates a SQLLambdaModelDataSourceStrategy where the binding's `customSqlStatements` are populated from `sqlFiles`.

The key
of the `customSqlStatements` record is the file's base name (that is, the name of the file minus the directory and extension).

###### `sqlFiles`<sup>Required</sup> <a name="sqlFiles" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategyFactory.fromCustomSqlFiles.parameter.sqlFiles"></a>

- *Type:* string[]

the list of files to load SQL statements from.

---

###### `options`<sup>Required</sup> <a name="options" id="@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategyFactory.fromCustomSqlFiles.parameter.options"></a>

- *Type:* <a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy">SQLLambdaModelDataSourceStrategy</a>

the remaining SQLLambdaModelDataSourceStrategy options.

---



## Protocols <a name="Protocols" id="Protocols"></a>

### IAmplifyGraphqlDefinition <a name="IAmplifyGraphqlDefinition" id="@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition"></a>

- *Implemented By:* <a href="#@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition">IAmplifyGraphqlDefinition</a>

Graphql Api definition, which can be implemented in multiple ways.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition.property.dataSourceStrategies">dataSourceStrategies</a></code> | <code>{[ key: string ]: <a href="#@aws-amplify/graphql-api-construct.DefaultDynamoDbModelDataSourceStrategy">DefaultDynamoDbModelDataSourceStrategy</a> \| <a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbModelDataSourceStrategy">AmplifyDynamoDbModelDataSourceStrategy</a> \| <a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy">SQLLambdaModelDataSourceStrategy</a>}</code> | Retrieve the datasource strategy mapping. |
| <code><a href="#@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition.property.functionSlots">functionSlots</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot">MutationFunctionSlot</a> \| <a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot">QueryFunctionSlot</a> \| <a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]</code> | Retrieve any function slots defined explicitly in the Api definition. |
| <code><a href="#@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition.property.schema">schema</a></code> | <code>string</code> | Return the schema definition as a graphql string, with amplify directives allowed. |
| <code><a href="#@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition.property.customSqlDataSourceStrategies">customSqlDataSourceStrategies</a></code> | <code><a href="#@aws-amplify/graphql-api-construct.CustomSqlDataSourceStrategy">CustomSqlDataSourceStrategy</a>[]</code> | An array of custom Query or Mutation SQL commands to the data sources that resolves them. |
| <code><a href="#@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition.property.referencedLambdaFunctions">referencedLambdaFunctions</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}</code> | Retrieve the references to any lambda functions used in the definition. |

---

##### `dataSourceStrategies`<sup>Required</sup> <a name="dataSourceStrategies" id="@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition.property.dataSourceStrategies"></a>

```typescript
public readonly dataSourceStrategies: {[ key: string ]: DefaultDynamoDbModelDataSourceStrategy | AmplifyDynamoDbModelDataSourceStrategy | SQLLambdaModelDataSourceStrategy};
```

- *Type:* {[ key: string ]: <a href="#@aws-amplify/graphql-api-construct.DefaultDynamoDbModelDataSourceStrategy">DefaultDynamoDbModelDataSourceStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.AmplifyDynamoDbModelDataSourceStrategy">AmplifyDynamoDbModelDataSourceStrategy</a> | <a href="#@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy">SQLLambdaModelDataSourceStrategy</a>}

Retrieve the datasource strategy mapping.

The default strategy is to use DynamoDB from CloudFormation.

---

##### `functionSlots`<sup>Required</sup> <a name="functionSlots" id="@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition.property.functionSlots"></a>

```typescript
public readonly functionSlots: MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot[];
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.MutationFunctionSlot">MutationFunctionSlot</a> | <a href="#@aws-amplify/graphql-api-construct.QueryFunctionSlot">QueryFunctionSlot</a> | <a href="#@aws-amplify/graphql-api-construct.SubscriptionFunctionSlot">SubscriptionFunctionSlot</a>[]

Retrieve any function slots defined explicitly in the Api definition.

---

##### `schema`<sup>Required</sup> <a name="schema" id="@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition.property.schema"></a>

```typescript
public readonly schema: string;
```

- *Type:* string

Return the schema definition as a graphql string, with amplify directives allowed.

---

##### `customSqlDataSourceStrategies`<sup>Optional</sup> <a name="customSqlDataSourceStrategies" id="@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition.property.customSqlDataSourceStrategies"></a>

```typescript
public readonly customSqlDataSourceStrategies: CustomSqlDataSourceStrategy[];
```

- *Type:* <a href="#@aws-amplify/graphql-api-construct.CustomSqlDataSourceStrategy">CustomSqlDataSourceStrategy</a>[]

An array of custom Query or Mutation SQL commands to the data sources that resolves them.

---

##### `referencedLambdaFunctions`<sup>Optional</sup> <a name="referencedLambdaFunctions" id="@aws-amplify/graphql-api-construct.IAmplifyGraphqlDefinition.property.referencedLambdaFunctions"></a>

```typescript
public readonly referencedLambdaFunctions: {[ key: string ]: IFunction};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_lambda.IFunction}

Retrieve the references to any lambda functions used in the definition.

Useful for wiring through aws_lambda.Function constructs into the definition directly,
and generated references to invoke them.

---

### IBackendOutputEntry <a name="IBackendOutputEntry" id="@aws-amplify/graphql-api-construct.IBackendOutputEntry"></a>

- *Implemented By:* <a href="#@aws-amplify/graphql-api-construct.IBackendOutputEntry">IBackendOutputEntry</a>

Entry representing the required output from the backend for codegen generate commands to work.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.IBackendOutputEntry.property.payload">payload</a></code> | <code>{[ key: string ]: string}</code> | The string-map payload of generated config values. |
| <code><a href="#@aws-amplify/graphql-api-construct.IBackendOutputEntry.property.version">version</a></code> | <code>string</code> | The protocol version for this backend output. |

---

##### `payload`<sup>Required</sup> <a name="payload" id="@aws-amplify/graphql-api-construct.IBackendOutputEntry.property.payload"></a>

```typescript
public readonly payload: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}

The string-map payload of generated config values.

---

##### `version`<sup>Required</sup> <a name="version" id="@aws-amplify/graphql-api-construct.IBackendOutputEntry.property.version"></a>

```typescript
public readonly version: string;
```

- *Type:* string

The protocol version for this backend output.

---

### IBackendOutputStorageStrategy <a name="IBackendOutputStorageStrategy" id="@aws-amplify/graphql-api-construct.IBackendOutputStorageStrategy"></a>

- *Implemented By:* <a href="#@aws-amplify/graphql-api-construct.IBackendOutputStorageStrategy">IBackendOutputStorageStrategy</a>

Backend output strategy used to write config required for codegen tasks.

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.IBackendOutputStorageStrategy.addBackendOutputEntry">addBackendOutputEntry</a></code> | Add an entry to backend output. |

---

##### `addBackendOutputEntry` <a name="addBackendOutputEntry" id="@aws-amplify/graphql-api-construct.IBackendOutputStorageStrategy.addBackendOutputEntry"></a>

```typescript
public addBackendOutputEntry(keyName: string, backendOutputEntry: IBackendOutputEntry): void
```

Add an entry to backend output.

###### `keyName`<sup>Required</sup> <a name="keyName" id="@aws-amplify/graphql-api-construct.IBackendOutputStorageStrategy.addBackendOutputEntry.parameter.keyName"></a>

- *Type:* string

the key.

---

###### `backendOutputEntry`<sup>Required</sup> <a name="backendOutputEntry" id="@aws-amplify/graphql-api-construct.IBackendOutputStorageStrategy.addBackendOutputEntry.parameter.backendOutputEntry"></a>

- *Type:* <a href="#@aws-amplify/graphql-api-construct.IBackendOutputEntry">IBackendOutputEntry</a>

the record to store in the backend output.

---


## Enums <a name="Enums" id="Enums"></a>

### SSEType <a name="SSEType" id="@aws-amplify/graphql-api-construct.SSEType"></a>

Server Side Encryption Type Values - `KMS` - Server-side encryption that uses AWS KMS.

The key is stored in your account and is managed by KMS (AWS KMS charges apply).

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/graphql-api-construct.SSEType.KMS">KMS</a></code> | *No description.* |

---

##### `KMS` <a name="KMS" id="@aws-amplify/graphql-api-construct.SSEType.KMS"></a>

---

