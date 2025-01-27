#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'ValidateTest');

new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type User @model @auth(rules: [{ allow: public }]) {
      id: ID!
      email: String! @validate(type: matches, value: "^[A-Za-z0-9+_.-]+@(.+)$", errorMessage: "Invalid email format")
      age: Int! @validate(type: gte, value: "18", errorMessage: "Age must be 18 or older")
    }
  `),
  authorizationModes: { apiKeyConfig: { expires: cdk.Duration.days(7) } },
});
