#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration } from 'aws-cdk-lib';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

new AmplifyGraphqlApi(stack, 'ModelIntro', {
  apiName: 'ModelIntroApi',
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      description: String!
    }
  `),
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
  modelIntrospectionSchemaProvider: {
    transformModelSchemaIntoModelIntrospectionSchema: () => {
      const modelIntrospectionSchema = {
        version: 1,
        models: {
          Todo: {
            name: 'Todo',
            fields: {
              id: {
                name: 'id',
                type: 'ID',
                isArray: false,
                isRequired: false,
              },
              description: {
                name: 'description',
                type: 'String',
                isArray: false,
                isRequired: true,
              },
              createdAt: {
                name: 'createdAt',
                type: 'AWSDateTime',
                isArray: false,
                isRequired: false,
              },
              updatedAt: {
                name: 'updatedAt',
                type: 'AWSDateTime',
                isArray: false,
                isRequired: false,
              },
            },
            pluralName: 'Todos',
            primaryKeyInfo: {
              isCustomPrimaryKey: false,
              primaryKeyFieldName: 'id',
              sortKeyFieldNames: [],
            },
          },
        },
        nonModels: {},
        enums: {},
      };
      return JSON.stringify(modelIntrospectionSchema);
    },
  },
});
