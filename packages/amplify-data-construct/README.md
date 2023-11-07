# AmplifyData Construct

[![View on Construct Hub](https://constructs.dev/badge?package=%40aws-amplify%2Fdata-construct)](https://constructs.dev/packages/@aws-amplify/data-construct)

This package vends an L3 CDK Construct wrapping the behavior of the Amplify GraphQL Transformer. This enables quick development and interation of AppSync APIs which support the Amplify GraphQL Directives. For more information on schema modeling in GraphQL, please refer to the [amplify developer docs](https://docs.amplify.aws/cli/graphql/overview/).

The primary way to use this construct is to invoke it with a provided schema (either as an inline graphql string, or as one or more `appsync.SchemaFile`) objects, and with authorization config provided. There are 5 supported methods for authorization of an AppSync API, all of which are supported by this construct. For more information on authorization rule definitions in Amplify, refer to the [authorization docs](https://docs.amplify.aws/cli/graphql/authorization-rules/). Note: currently at least one authorization rule is required, and if multiple are specified, a `defaultAuthorizationMode` must be specified on the api as well. Specified authorization modes must be a superset of those configured in the graphql schema.

Note: only a single instance of the `AmplifyData` construct can be invoked within a CDK synthesis at this point in time.

## Examples

### Simple Todo List With Cognito Userpool-based Owner Authorization

In this example, we create a single model, which will use `user pool` auth in order to allow logged in users to create and manage their own `todos` privately.

We create a cdk App and Stack, though you may be deploying this to a custom stack, this is purely illustrative for a concise demo.

We then wire this through to import a user pool which was already deployed (creating and deploying is out of scope for this example).

```ts
import { App, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { AmplifyData, AmplifyDataDefinition } from '@aws-amplify/data-construct';

const app = new App();
const stack = new Stack(app, 'TodoStack');

new AmplifyData(stack, 'TodoApp', {
  definition: AmplifyDataDefinition.fromString(/* GraphQL */ `
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
import { AmplifyData, AmplifyDataDefinition } from '@aws-amplify/data-construct';

const app = new App();
const stack = new Stack(app, 'BlogStack');

new AmplifyData(stack, 'BlogApp', {
  definition: AmplifyDataDefinition.fromString(/* GraphQL */ `
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
import { AmplifyData, AmplifyDataDefinition } from '@aws-amplify/data-construct';

const app = new App();
const stack = new Stack(app, 'MultiFileStack');

new AmplifyData(stack, 'MultiFileDefinition', {
  definition: AmplifyDataDefinition.fromFiles(path.join(__dirname, 'todo.graphql'), path.join(__dirname, 'blog.graphql')),
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

### AmplifyData <a name="AmplifyData" id="@aws-amplify/data-construct.AmplifyData"></a>

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
  const api = new AmplifyData(this, 'api', { <params> });
  // Access L2 resources under `.resources`
  api.resources.tables["Todo"].tableArn;

  // Access L1 resources under `.resources.cfnResources`
  api.resources.cfnResources.cfnGraphqlApi.xrayEnabled = true;
  Object.values(api.resources.cfnResources.cfnTables).forEach(table => {
    table.pointInTimeRecoverySpecification = { pointInTimeRecoveryEnabled: false };
  });
```
`resources.<ResourceType>.<ResourceName>` - you can then perform any CDK action on these resulting resoureces.

#### Initializers <a name="Initializers" id="@aws-amplify/data-construct.AmplifyData.Initializer"></a>

```typescript
import { AmplifyData } from '@aws-amplify/data-construct'

new AmplifyData(scope: Construct, id: string, props: AmplifyGraphqlApiProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | the scope to create this construct within. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.Initializer.parameter.id">id</a></code> | <code>string</code> | the id to use for this api. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.Initializer.parameter.props">props</a></code> | <code>@aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps</code> | the properties used to configure the generated api. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@aws-amplify/data-construct.AmplifyData.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

the scope to create this construct within.

---

##### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.Initializer.parameter.id"></a>

- *Type:* string

the id to use for this api.

---

##### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/data-construct.AmplifyData.Initializer.parameter.props"></a>

- *Type:* @aws-amplify/graphql-api-construct.AmplifyGraphqlApiProps

the properties used to configure the generated api.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.addDynamoDbDataSource">addDynamoDbDataSource</a></code> | Add a new DynamoDB data source to this API. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.addElasticsearchDataSource">addElasticsearchDataSource</a></code> | Add a new elasticsearch data source to this API. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.addEventBridgeDataSource">addEventBridgeDataSource</a></code> | Add an EventBridge data source to this api. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.addFunction">addFunction</a></code> | Add an appsync function to the api. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.addHttpDataSource">addHttpDataSource</a></code> | Add a new http data source to this API. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.addLambdaDataSource">addLambdaDataSource</a></code> | Add a new Lambda data source to this API. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.addNoneDataSource">addNoneDataSource</a></code> | Add a new dummy data source to this API. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.addOpenSearchDataSource">addOpenSearchDataSource</a></code> | dd a new OpenSearch data source to this API. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.addRdsDataSource">addRdsDataSource</a></code> | Add a new Rds data source to this API. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.addResolver">addResolver</a></code> | Add a resolver to the api. |

---

##### `toString` <a name="toString" id="@aws-amplify/data-construct.AmplifyData.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `addDynamoDbDataSource` <a name="addDynamoDbDataSource" id="@aws-amplify/data-construct.AmplifyData.addDynamoDbDataSource"></a>

```typescript
public addDynamoDbDataSource(id: string, table: ITable, options?: DataSourceOptions): DynamoDbDataSource
```

Add a new DynamoDB data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.addDynamoDbDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `table`<sup>Required</sup> <a name="table" id="@aws-amplify/data-construct.AmplifyData.addDynamoDbDataSource.parameter.table"></a>

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

The DynamoDB table backing this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/data-construct.AmplifyData.addDynamoDbDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### ~~`addElasticsearchDataSource`~~ <a name="addElasticsearchDataSource" id="@aws-amplify/data-construct.AmplifyData.addElasticsearchDataSource"></a>

```typescript
public addElasticsearchDataSource(id: string, domain: IDomain, options?: DataSourceOptions): ElasticsearchDataSource
```

Add a new elasticsearch data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.addElasticsearchDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `domain`<sup>Required</sup> <a name="domain" id="@aws-amplify/data-construct.AmplifyData.addElasticsearchDataSource.parameter.domain"></a>

- *Type:* aws-cdk-lib.aws_elasticsearch.IDomain

The elasticsearch domain for this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/data-construct.AmplifyData.addElasticsearchDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addEventBridgeDataSource` <a name="addEventBridgeDataSource" id="@aws-amplify/data-construct.AmplifyData.addEventBridgeDataSource"></a>

```typescript
public addEventBridgeDataSource(id: string, eventBus: IEventBus, options?: DataSourceOptions): EventBridgeDataSource
```

Add an EventBridge data source to this api.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.addEventBridgeDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `eventBus`<sup>Required</sup> <a name="eventBus" id="@aws-amplify/data-construct.AmplifyData.addEventBridgeDataSource.parameter.eventBus"></a>

- *Type:* aws-cdk-lib.aws_events.IEventBus

The EventBridge EventBus on which to put events.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/data-construct.AmplifyData.addEventBridgeDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addFunction` <a name="addFunction" id="@aws-amplify/data-construct.AmplifyData.addFunction"></a>

```typescript
public addFunction(id: string, props: AddFunctionProps): AppsyncFunction
```

Add an appsync function to the api.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.addFunction.parameter.id"></a>

- *Type:* string

the function's id.

---

###### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/data-construct.AmplifyData.addFunction.parameter.props"></a>

- *Type:* @aws-amplify/graphql-api-construct.AddFunctionProps

---

##### `addHttpDataSource` <a name="addHttpDataSource" id="@aws-amplify/data-construct.AmplifyData.addHttpDataSource"></a>

```typescript
public addHttpDataSource(id: string, endpoint: string, options?: HttpDataSourceOptions): HttpDataSource
```

Add a new http data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.addHttpDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `endpoint`<sup>Required</sup> <a name="endpoint" id="@aws-amplify/data-construct.AmplifyData.addHttpDataSource.parameter.endpoint"></a>

- *Type:* string

The http endpoint.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/data-construct.AmplifyData.addHttpDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.HttpDataSourceOptions

The optional configuration for this data source.

---

##### `addLambdaDataSource` <a name="addLambdaDataSource" id="@aws-amplify/data-construct.AmplifyData.addLambdaDataSource"></a>

```typescript
public addLambdaDataSource(id: string, lambdaFunction: IFunction, options?: DataSourceOptions): LambdaDataSource
```

Add a new Lambda data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.addLambdaDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `lambdaFunction`<sup>Required</sup> <a name="lambdaFunction" id="@aws-amplify/data-construct.AmplifyData.addLambdaDataSource.parameter.lambdaFunction"></a>

- *Type:* aws-cdk-lib.aws_lambda.IFunction

The Lambda function to call to interact with this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/data-construct.AmplifyData.addLambdaDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addNoneDataSource` <a name="addNoneDataSource" id="@aws-amplify/data-construct.AmplifyData.addNoneDataSource"></a>

```typescript
public addNoneDataSource(id: string, options?: DataSourceOptions): NoneDataSource
```

Add a new dummy data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.
Useful for pipeline resolvers and for backend changes that don't require a data source.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.addNoneDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/data-construct.AmplifyData.addNoneDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addOpenSearchDataSource` <a name="addOpenSearchDataSource" id="@aws-amplify/data-construct.AmplifyData.addOpenSearchDataSource"></a>

```typescript
public addOpenSearchDataSource(id: string, domain: IDomain, options?: DataSourceOptions): OpenSearchDataSource
```

dd a new OpenSearch data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.addOpenSearchDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `domain`<sup>Required</sup> <a name="domain" id="@aws-amplify/data-construct.AmplifyData.addOpenSearchDataSource.parameter.domain"></a>

- *Type:* aws-cdk-lib.aws_opensearchservice.IDomain

The OpenSearch domain for this data source.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/data-construct.AmplifyData.addOpenSearchDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addRdsDataSource` <a name="addRdsDataSource" id="@aws-amplify/data-construct.AmplifyData.addRdsDataSource"></a>

```typescript
public addRdsDataSource(id: string, serverlessCluster: IServerlessCluster, secretStore: ISecret, databaseName?: string, options?: DataSourceOptions): RdsDataSource
```

Add a new Rds data source to this API.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.addRdsDataSource.parameter.id"></a>

- *Type:* string

The data source's id.

---

###### `serverlessCluster`<sup>Required</sup> <a name="serverlessCluster" id="@aws-amplify/data-construct.AmplifyData.addRdsDataSource.parameter.serverlessCluster"></a>

- *Type:* aws-cdk-lib.aws_rds.IServerlessCluster

The serverless cluster to interact with this data source.

---

###### `secretStore`<sup>Required</sup> <a name="secretStore" id="@aws-amplify/data-construct.AmplifyData.addRdsDataSource.parameter.secretStore"></a>

- *Type:* aws-cdk-lib.aws_secretsmanager.ISecret

The secret store that contains the username and password for the serverless cluster.

---

###### `databaseName`<sup>Optional</sup> <a name="databaseName" id="@aws-amplify/data-construct.AmplifyData.addRdsDataSource.parameter.databaseName"></a>

- *Type:* string

The optional name of the database to use within the cluster.

---

###### `options`<sup>Optional</sup> <a name="options" id="@aws-amplify/data-construct.AmplifyData.addRdsDataSource.parameter.options"></a>

- *Type:* aws-cdk-lib.aws_appsync.DataSourceOptions

The optional configuration for this data source.

---

##### `addResolver` <a name="addResolver" id="@aws-amplify/data-construct.AmplifyData.addResolver"></a>

```typescript
public addResolver(id: string, props: ExtendedResolverProps): Resolver
```

Add a resolver to the api.

This is a proxy method to the L2 GraphqlApi Construct.

###### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/data-construct.AmplifyData.addResolver.parameter.id"></a>

- *Type:* string

The resolver's id.

---

###### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/data-construct.AmplifyData.addResolver.parameter.props"></a>

- *Type:* aws-cdk-lib.aws_appsync.ExtendedResolverProps

the resolver properties.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="@aws-amplify/data-construct.AmplifyData.isConstruct"></a>

```typescript
import { AmplifyData } from '@aws-amplify/data-construct'

AmplifyData.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="@aws-amplify/data-construct.AmplifyData.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.property.apiId">apiId</a></code> | <code>string</code> | Generated Api Id. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.property.generatedFunctionSlots">generatedFunctionSlots</a></code> | <code>@aws-amplify/graphql-api-construct.MutationFunctionSlot \| @aws-amplify/graphql-api-construct.QueryFunctionSlot \| @aws-amplify/graphql-api-construct.SubscriptionFunctionSlot[]</code> | Resolvers generated by the transform process, persisted on the side in order to facilitate pulling a manifest for the purposes of inspecting and producing overrides. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.property.graphqlUrl">graphqlUrl</a></code> | <code>string</code> | Graphql URL For the generated API. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.property.realtimeUrl">realtimeUrl</a></code> | <code>string</code> | Realtime URL For the generated API. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.property.resources">resources</a></code> | <code>@aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources</code> | Generated L1 and L2 CDK resources. |
| <code><a href="#@aws-amplify/data-construct.AmplifyData.property.apiKey">apiKey</a></code> | <code>string</code> | Generated Api Key if generated. |

---

##### `node`<sup>Required</sup> <a name="node" id="@aws-amplify/data-construct.AmplifyData.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `apiId`<sup>Required</sup> <a name="apiId" id="@aws-amplify/data-construct.AmplifyData.property.apiId"></a>

```typescript
public readonly apiId: string;
```

- *Type:* string

Generated Api Id.

May be a CDK Token.

---

##### `generatedFunctionSlots`<sup>Required</sup> <a name="generatedFunctionSlots" id="@aws-amplify/data-construct.AmplifyData.property.generatedFunctionSlots"></a>

```typescript
public readonly generatedFunctionSlots: MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot[];
```

- *Type:* @aws-amplify/graphql-api-construct.MutationFunctionSlot | @aws-amplify/graphql-api-construct.QueryFunctionSlot | @aws-amplify/graphql-api-construct.SubscriptionFunctionSlot[]

Resolvers generated by the transform process, persisted on the side in order to facilitate pulling a manifest for the purposes of inspecting and producing overrides.

---

##### `graphqlUrl`<sup>Required</sup> <a name="graphqlUrl" id="@aws-amplify/data-construct.AmplifyData.property.graphqlUrl"></a>

```typescript
public readonly graphqlUrl: string;
```

- *Type:* string

Graphql URL For the generated API.

May be a CDK Token.

---

##### `realtimeUrl`<sup>Required</sup> <a name="realtimeUrl" id="@aws-amplify/data-construct.AmplifyData.property.realtimeUrl"></a>

```typescript
public readonly realtimeUrl: string;
```

- *Type:* string

Realtime URL For the generated API.

May be a CDK Token.

---

##### `resources`<sup>Required</sup> <a name="resources" id="@aws-amplify/data-construct.AmplifyData.property.resources"></a>

```typescript
public readonly resources: AmplifyGraphqlApiResources;
```

- *Type:* @aws-amplify/graphql-api-construct.AmplifyGraphqlApiResources

Generated L1 and L2 CDK resources.

---

##### `apiKey`<sup>Optional</sup> <a name="apiKey" id="@aws-amplify/data-construct.AmplifyData.property.apiKey"></a>

```typescript
public readonly apiKey: string;
```

- *Type:* string

Generated Api Key if generated.

May be a CDK Token.

---



## Classes <a name="Classes" id="Classes"></a>

### AmplifyDataDefinition <a name="AmplifyDataDefinition" id="@aws-amplify/data-construct.AmplifyDataDefinition"></a>

#### Initializers <a name="Initializers" id="@aws-amplify/data-construct.AmplifyDataDefinition.Initializer"></a>

```typescript
import { AmplifyDataDefinition } from '@aws-amplify/data-construct'

new AmplifyDataDefinition()
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |

---


#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@aws-amplify/data-construct.AmplifyDataDefinition.fromFiles">fromFiles</a></code> | Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema. |
| <code><a href="#@aws-amplify/data-construct.AmplifyDataDefinition.fromString">fromString</a></code> | Produce a schema definition from a string input. |

---

##### `fromFiles` <a name="fromFiles" id="@aws-amplify/data-construct.AmplifyDataDefinition.fromFiles"></a>

```typescript
import { AmplifyDataDefinition } from '@aws-amplify/data-construct'

AmplifyDataDefinition.fromFiles(filePaths: string)
```

Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema.

###### `filePaths`<sup>Required</sup> <a name="filePaths" id="@aws-amplify/data-construct.AmplifyDataDefinition.fromFiles.parameter.filePaths"></a>

- *Type:* string

one or more paths to the graphql files to process.

---

##### `fromString` <a name="fromString" id="@aws-amplify/data-construct.AmplifyDataDefinition.fromString"></a>

```typescript
import { AmplifyDataDefinition } from '@aws-amplify/data-construct'

AmplifyDataDefinition.fromString(schema: string)
```

Produce a schema definition from a string input.

###### `schema`<sup>Required</sup> <a name="schema" id="@aws-amplify/data-construct.AmplifyDataDefinition.fromString.parameter.schema"></a>

- *Type:* string

the graphql input as a string.

---




