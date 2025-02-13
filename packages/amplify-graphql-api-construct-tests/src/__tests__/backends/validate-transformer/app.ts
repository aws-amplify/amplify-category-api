#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new cdk.App();
const stack = new cdk.Stack(app, packageJson.name.replace(/_/g, '-'));

new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type User @model @auth(rules: [{ allow: public }]) {
      id: ID!
      score: Float @validate(type: gt, value: "0") @validate(type: lt, value: "100")
      age: Int @validate(type: gte, value: "18") @validate(type: lte, value: "65")
      username: String @validate(type: minLength, value: "3") @validate(type: maxLength, value: "10")
      prefix: String @validate(type: startsWith, value: "user_")
      filename: String @validate(type: endsWith, value: ".txt")
      email: String @validate(type: matches, value: "^[A-Za-z0-9+_.-]+@(.+)$", errorMessage: "Invalid email format")
    }

    type Product @model @auth(rules: [{ allow: public }]) {
      id: ID!
      name: String
        @validate(type: minLength, value: "5")
        @validate(type: maxLength, value: "50")
        @validate(type: matches, value: "^[a-zA-Z0-9\\\\s-]+$", errorMessage: "Only alphanumeric characters, spaces, and hyphens allowed")

      price: Float @validate(type: gt, value: "0") @validate(type: lt, value: "10000")

      stockQuantity: Int @validate(type: gte, value: "0") @validate(type: lte, value: "1000")

      sku: String
        @validate(type: startsWith, value: "PRD-")
        @validate(type: matches, value: "^PRD-[A-Z0-9]{8}$", errorMessage: "SKU must be PRD- followed by 8 alphanumeric characters")
        @validate(type: minLength, value: "12")

      description: String
        @validate(type: minLength, value: "20")
        @validate(type: maxLength, value: "500")
        @validate(type: matches, value: "^[\\\\w\\\\s.,!?-]+$", errorMessage: "Invalid characters in description")

      category: String
        @validate(type: minLength, value: "4")
        @validate(type: matches, value: "^[A-Z][a-z]+$", errorMessage: "Category must be capitalized")
    }
  `),
  authorizationModes: { apiKeyConfig: { expires: cdk.Duration.days(7) } },
});
