#!/usr/bin/env node
import { App, Duration, Stack } from 'aws-cdk-lib';
import 'source-map-support/register';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import { Code, FunctionRuntime, Resolver } from 'aws-cdk-lib/aws-appsync';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as fs from 'fs';
import * as path from 'path';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const api = new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Query {
      reverse(message: String): String @function(name: "reverse")
      echo(message: String): String
    }
  `),
  functionNameMap: {
    reverse: new NodejsFunction(stack, 'Reverse', { entry: path.join(__dirname, 'reverse.ts') }),
  },
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
});

new Resolver(stack, 'EchoResolver', {
  api: api.resources.graphqlApi,
  dataSource: api.resources.graphqlApi.addNoneDataSource('NoneDataSource'),
  typeName: 'Query',
  fieldName: 'echo',
  runtime: FunctionRuntime.JS_1_0_0,
  code: Code.fromInline(fs.readFileSync(path.join(__dirname, 'echo.js'), 'utf-8')),
});
