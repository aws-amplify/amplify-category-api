#!/usr/bin/env node
// eslint-disable-next-line import/no-extraneous-dependencies
import 'source-map-support/register';
import * as path from 'path';
import { App, Stack, Duration } from 'aws-cdk-lib';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const helloFn = new NodejsFunction(stack, 'HelloApiGwFunction', { entry: path.join(__dirname, 'hello-apigw.ts') });

const restApi = new LambdaRestApi(stack, 'HelloApi', {
  handler: helloFn,
  proxy: false,
});

const restApiUrl = restApi.url;

const helloResource = restApi.root.addResource('hello');
helloResource.addMethod('GET');

new AmplifyGraphqlApi(stack, 'ExtensionTest', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Query {
      myFunctionQueryBase: String @function(name: "myFunctionQueryBase") @auth(rules: [{ allow: custom }])
      myHttpQueryBase: String @http(url: "${restApiUrl}/hello") @auth(rules: [{ allow: custom }])
    }

    extend type Query {
      myFunctionQueryExtended: String @function(name: "myFunctionQueryExtended") @auth(rules: [{ allow: custom }])
      myHttpQueryExtended: String @http(url: "${restApiUrl}/hello") @auth(rules: [{ allow: custom }])
    }

    type Mutation {
      myFunctionMutationBase: String @function(name: "myFunctionQueryBase") @auth(rules: [{ allow: custom }])
      myHttpMutationBase: String @http(url: "${restApiUrl}/hello") @auth(rules: [{ allow: custom }])
    }

    extend type Mutation {
      myFunctionMutationExtended: String @function(name: "myFunctionQueryExtended") @auth(rules: [{ allow: custom }])
      myHttpMutationExtended: String @http(url: "${restApiUrl}/hello") @auth(rules: [{ allow: custom }])
    }
  `),

  functionNameMap: {
    myFunctionQueryBase: new NodejsFunction(stack, 'FunctionQueryBase', { entry: path.join(__dirname, 'hello-resolver.ts') }),
    myFunctionQueryExtended: new NodejsFunction(stack, 'FunctionQueryExtended', { entry: path.join(__dirname, 'hello-resolver.ts') }),
  },

  authorizationModes: {
    // Make sure we keep API Key as the default auth mode. The tests include specific assertions that we do not fall back to the API's
    // default auth mode
    defaultAuthorizationMode: 'API_KEY',
    apiKeyConfig: { expires: Duration.days(2) },
    lambdaConfig: {
      function: new NodejsFunction(stack, 'Authorizer', { entry: path.join(__dirname, 'authorizer.ts') }),
      ttl: Duration.minutes(0),
    },
  },
});
