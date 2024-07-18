#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration } from 'aws-cdk-lib';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const importedAmplifyDynamoDBTableMap: Record<string, string> = require('../table-map.json');

new AmplifyGraphqlApi(stack, 'Data', {
  apiName: 'MyGraphQLApi',
  definition: AmplifyGraphqlDefinition.combine([
    AmplifyGraphqlDefinition.fromString(
      /* GraphQL */ `
      type Post @model @auth(rules: [{ allow: public }]) {
        id: ID!
        title: String!
        content: String
        tags: [PostTags] @hasMany(references: "tagID")
      }`,
      {
        dbType: 'DYNAMODB' as const,
        provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
        tableName: importedAmplifyDynamoDBTableMap.Post,
      }
    ),
    AmplifyGraphqlDefinition.fromString(
      /* GraphQL */ `
      type Tag @model @auth(rules: [{ allow: public }]) {
        id: ID!
        label: String!
        posts: [PostTags] @hasMany(references: "postID")
      }`,
      {
        dbType: 'DYNAMODB' as const,
        provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
        tableName: importedAmplifyDynamoDBTableMap.Tag,
      }
    ),
    AmplifyGraphqlDefinition.fromString(
      /* GraphQL */ `
      type PostTags @model @auth(rules: [{ allow: public }]) {
        postID: ID
        tagID: ID
        post: Post @belongsTo(references: "postID") 
        tag: Tag @belongsTo(references: "tagID")
      }`,
      {
        dbType: 'DYNAMODB' as const,
        provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
        tableName: importedAmplifyDynamoDBTableMap.PostTags,
      }
    ),
  ]),
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
});