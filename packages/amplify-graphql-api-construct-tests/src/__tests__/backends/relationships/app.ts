#!/usr/bin/env node
import { App, Duration, Stack } from 'aws-cdk-lib';
import 'source-map-support/register';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Blog @model @auth(rules: [{ allow: public }]) {
      title: String!
      description: String!
      posts: [Post] @hasMany
    }

    type Post @model @auth(rules: [{ allow: public }]) {
      title: String!
      content: [String]
      blog: Blog @belongsTo
      tags: [Tag] @manyToMany(relationName: "PostTags")
      author: Author @hasOne
    }

    type Author @model @auth(rules: [{ allow: public }]) {
      byLine: String!
      firstName: String
      lastName: String
      additionalNameParts: [String]
    }

    type Tag @model @auth(rules: [{ allow: public }]) {
      name: String!
      posts: [Post] @manyToMany(relationName: "PostTags")
    }
  `),
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
});
