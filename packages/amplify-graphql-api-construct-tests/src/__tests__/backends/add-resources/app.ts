#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import 'source-map-support/register';
// @ts-ignore
import * as graphql from '@aws-amplify/graphql-api-construct';

const packageJson = require('../package.json');

const app = new cdk.App();
const stack = new cdk.Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const api = new graphql.AmplifyGraphqlApi(stack, 'GraphqlApi', {
  definition: graphql.AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Query {
      echo(message: String!): String!
    }
  `),
  authorizationModes: { apiKeyConfig: { expires: cdk.Duration.days(7) } },
});

api.addResolver('EchoResolver', {
  typeName: 'Query',
  fieldName: 'echo',
  code: appsync.Code.fromInline(`
    export function request(ctx) {
      return {};
    }

    export function response(ctx) {
      return ctx.prev.result;
    }
  `),
  runtime: appsync.FunctionRuntime.JS_1_0_0,
  pipelineConfig: [
    api.addFunction('DoEcho', {
      name: 'DoEchoFn',
      dataSource: api.addNoneDataSource('MyNoneDS'),
      code: appsync.Code.fromInline(`
        /**
         * Publishes an event localy
         * @param {*} ctx the context
         * @returns {import('@aws-appsync/utils').NONERequest} the request
         */
        export function request(ctx) {
          return {
            payload: {},
          };
        }
        
        /**
         * Forward the payload in the result object
         * @param {import('@aws-appsync/utils').Context} ctx the context
         * @returns {*} the result
         */
        export function response(ctx) {
          return ctx.arguments.message;
        }
      `),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    }),
  ],
});
