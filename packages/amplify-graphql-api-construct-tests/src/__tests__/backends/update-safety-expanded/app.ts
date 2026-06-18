#!/usr/bin/env node
import { App, Duration, Stack } from 'aws-cdk-lib';
// @ts-ignore
import { AmplifyData, AmplifyDataDefinition } from '@aws-amplify/data-construct';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const newModels = Array.from(
  { length: 40 },
  (_, index) => `type NewOverflow${index} @model { id: ID! name: String }`,
).join('\n');

const app = new App();
const stack = new Stack(app, process.env.AMPLIFY_STACK_PREFIX ?? packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

new AmplifyData(stack, 'UpdateSafetyData', {
  definition: AmplifyDataDefinition.fromString(/* GraphQL */ `
    input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }

    type ExistingA @model {
      id: ID!
      name: String
    }

    type ExistingB @model {
      id: ID!
      name: String
    }

    type ExistingC @model {
      id: ID!
      name: String
    }

    ${newModels}
  `),
  authorizationModes: {
    defaultAuthorizationMode: 'API_KEY',
    apiKeyConfig: {
      expires: Duration.days(7),
    },
  },
});
