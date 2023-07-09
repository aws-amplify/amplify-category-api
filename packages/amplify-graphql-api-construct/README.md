# @aws-amplify/graphql-construct-alpha

## Overview

This construct generates AppSync APIs which support a rich data modeling language, and can deploy 'batteries-included' backends which can be quickly developed and iterated on, and which clients can be easily generated.

For more information on schema definition, refer to the [docs](https://docs.amplify.aws/cli/graphql/overview/). Note: while this library is under development some parameter names will likely have changed from the old system, but hopefully is self-explanatory enough to understand with the included documents.

There are two required props, the `schema`, and `authorizationConfig`, the authorization types provided in your authorization config must be a superset of the rule types referenced in your schema (e.g. if you specify an auth rule of type `public`, then `apiKeyConfig` must be set, for rules of type `owner`, then `userPoolConfig` must be set, etc.)

If more than a single authorization mode is configured on the api, then a default authorization mode must be specified.

For more information on the auth rules, including default providers for a given rule type, please refer to the [Auth Docs](https://docs.amplify.aws/cli/graphql/authorization-rules/#authorization-strategies).

There are additional properties, which are built to support full backwards compatibility with the existing API category in the Amplify CLI.

## Example Usage

### Simple Todo Application

```typescript
new AmplifyGraphqlApi(this, 'MyApi', {
  schema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      description: String!
      completed: Boolean
    }
  `,
  authorizationConfig: {
    apiKeyConfig: {
      description: 'Api Key for Public Access',
      expires: cdk.Duration.days(30),
    },
  },
});
```

### Model with Relationships

```typescript
new AmplifyGraphqlApi(this, 'MyApi', {
  schema: /* GraphQL */ `
    type Author @model @auth(rules: [
      { allow: owner }
      { allow: public, operations: [read] }
    ]) {
      firstName: String!
      lastName: String!
      blogs: [Blog] @manyToMany(relationName: "BlogAuthors")
    }

    type Blog @model @auth(rules: [
      { allow: owner }
      { allow: public, operations: [read] }
    ]) {
      title: String!
      description: String
      tags: [String]
      authors: [Author] @manyToMany(relationName: "BlogAuthors")
    }

    type Post @model @auth(rules: [
      { allow: public, operations: [read] }
      { allow: owner }
    ]) {
      content: String!
    }
  `,
  authorizationConfig: {
    defaultAuthMode: 'API_KEY',
    apiKeyConfig: {
      description: 'Api Key for Public Access',
      expires: cdk.Duration.days(30),
    },
    userPoolConfig: {
      userPool: cognito.UserPool.fromUserPoolId(this, 'ImportedUserPool', '<ExistingPoolId>'),
    },
  },
});
```
