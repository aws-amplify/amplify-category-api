#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration } from 'aws-cdk-lib';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Resolver, Code, FunctionRuntime } from 'aws-cdk-lib/aws-appsync';
import * as path from 'path';
import * as fs from 'fs';

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
