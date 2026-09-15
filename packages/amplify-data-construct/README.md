# AmplifyData Construct

[![View on Construct Hub](https://constructs.dev/badge?package=%40aws-amplify%2Fdata-construct)](https://constructs.dev/packages/@aws-amplify/data-construct)

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
