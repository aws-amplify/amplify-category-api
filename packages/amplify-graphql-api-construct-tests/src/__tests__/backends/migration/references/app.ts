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
      type Primary @model @auth(rules: [{ allow: public }]) {
        id: ID! @primaryKey
        relatedMany: [RelatedMany] @hasMany(references: "primaryId")
        relatedOne: RelatedOne @hasOne(references: "primaryId")
      }
      `,
      {
        dbType: 'DYNAMODB' as const,
        provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
        tableName: importedAmplifyDynamoDBTableMap.Primary,
      }
    ),
    AmplifyGraphqlDefinition.fromString(
      /* GraphQL */ `
      type RelatedMany @model @auth(rules: [{ allow: public }]) {
        id: ID! @primaryKey
        primaryId: String
        primary: Primary @belongsTo(references: ["primaryId"])
      }`,
      {
        dbType: 'DYNAMODB' as const,
        provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
        tableName: importedAmplifyDynamoDBTableMap.RelatedMany,
      }
    ),
    AmplifyGraphqlDefinition.fromString(
      /* GraphQL */ `
      type RelatedOne @model @auth(rules: [{ allow: public }]) {
        id: ID! @primaryKey
        primaryId: String
        primary: Primary @belongsTo(references: ["primaryId"])
      }`,
      {
        dbType: 'DYNAMODB' as const,
        provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
        tableName: importedAmplifyDynamoDBTableMap.RelatedOne,
      }
    ),
  ]),
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
});