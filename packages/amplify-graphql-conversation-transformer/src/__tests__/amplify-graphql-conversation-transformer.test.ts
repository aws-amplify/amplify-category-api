import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration, ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
import { ConversationTransformer } from '..';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GenerationTransformer } from '../../../amplify-graphql-generation-transformer/src';

const conversationSchemaTypes = fs.readFileSync(path.join(__dirname, '../graphql-types/conversation-schema-types.graphql'), 'utf8');

test('conversation route valid schema', () => {
  const routeName = 'pirateChat';
  const inputSchema = `
    type Temperature {
      value: Int
      unit: String
    }

    type Query {
      getTemperature(city: String!): Temperature
      plus(a: Int, b: Int): Int
    }

    type Mutation {
        ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
        @conversation(
          aiModel: "Claude3Haiku",
          functionName: "conversation-handler",
          systemPrompt: "You are a helpful chatbot. Answer questions to the best of your ability.",
          tools: [{ name: "getTemperature", description: "does a thing" }, { name: "plus", description: "does a different thing" }]
        )
    }

    ${conversationSchemaTypes}
  `;

  const out = transform(inputSchema);
  expect(out).toBeDefined();

  const resolverCode = getResolverResource(routeName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot();

  const resolverFnCode = getResolverFnResource(routeName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverFnCode).toBeDefined();
  expect(resolverFnCode).toMatchSnapshot();

  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('conversation route with model query tool', () => {
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [],
  };

  const inputSchema = `
    type Todo @model @auth(rules: [{ allow: owner }]) {
      content: String
      isDone: Boolean
    }

    type Mutation {
        pirateChat(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
        @conversation(
          aiModel: "Claude3Haiku",
          functionName: "conversation-handler",
          systemPrompt: "You are a helpful chatbot. Answer questions to the best of your ability.",
          tools: [{ name: "listTodos", description: "lists todos" }]
        )
    }

    ${conversationSchemaTypes}
  `;

  expect(() => {
    transform(inputSchema, { Todo: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY });
  }) // TODO: remove this once we support complex input types
    .toThrowError(/Complex input types not yet supported/);
});

test('conversation route without tools', () => {
  const routeName = 'pirateChat';

  const inputSchema = `
    type Mutation {
        ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
        @conversation(
          aiModel: "Claude3Haiku",
          functionName: "conversation-handler",
          systemPrompt: "You are a helpful chatbot. Answer questions to the best of your ability."
        )
    }

    ${conversationSchemaTypes}
  `;

  const out = transform(inputSchema);
  expect(out).toBeDefined();

  const resolverCode = getResolverResource(routeName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot();

  const resolverFnCode = getResolverFnResource(routeName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverFnCode).toBeDefined();
  expect(resolverFnCode).toMatchSnapshot();

  const schema = parse(out.schema);
  validateModelSchema(schema);
});

test('conversation route with inference configuration', () => {
  const routeName = 'pirateChat';

  const inputSchema = `
    type Mutation {
        ${routeName}(conversationId: ID!, content: [ContentBlockInput], aiContext: AWSJSON, toolConfiguration: ToolConfigurationInput): ConversationMessage
        @conversation(
          aiModel: "Claude3Haiku",
          systemPrompt: "You are a helpful chatbot. Answer questions to the best of your ability.",
          functionName: "conversation-handler",
          inferenceConfiguration: {
            temperature: 0.5,
            topP: 0.9,
            maxTokens: 100,
          }
        )
    }

    ${conversationSchemaTypes}
  `;

  const out = transform(inputSchema);
  expect(out).toBeDefined();

  const resolverCode = getResolverResource(routeName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverCode).toBeDefined();
  expect(resolverCode).toMatchSnapshot();

  const resolverFnCode = getResolverFnResource(routeName, out.rootStack.Resources)['Properties']['Code'];
  expect(resolverFnCode).toBeDefined();
  expect(resolverFnCode).toMatchSnapshot();

  const schema = parse(out.schema);
  validateModelSchema(schema);
});


const getResolverResource = (mutationName: string, resources?: Record<string, any>): Record<string, any> => {
  const resolverName = `Mutation${mutationName}Resolver`;
  return resources?.[resolverName];
};

const getResolverFnResource = (mtuationName: string, resources?: Record<string, any>): Record<string, any> => {
  const capitalizedQueryName = mtuationName.charAt(0).toUpperCase() + mtuationName.slice(1);
  const resourcePrefix = `Mutation${capitalizedQueryName}DataResolverFn`;
  if (!resources) {
    fail('No resources found.');
  }
  const resource = Object.entries(resources).find(([key, _]) => {
    return key.startsWith(resourcePrefix);
  })?.[1];

  if (!resource) {
    fail(`Resource named with prefix ${resourcePrefix} not found.`);
  }
  return resource;
};

const defaultAuthConfig: AppSyncAuthConfiguration = {
  defaultAuthentication: {
    authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  },
  additionalAuthenticationProviders: [],
};

function transform(
  inputSchema: string,
  dataSourceStrategies?: Record<string, ModelDataSourceStrategy>,
  authConfig: AppSyncAuthConfiguration = defaultAuthConfig,
): DeploymentResources {
  const modelTransformer = new ModelTransformer();
  const authTransformer = new AuthTransformer();
  const indexTransformer = new IndexTransformer();
  const hasOneTransformer = new HasOneTransformer();
  const belongsToTransformer = new BelongsToTransformer();
  const hasManyTransformer = new HasManyTransformer();

  const transformers = [
    modelTransformer,
    new PrimaryKeyTransformer(),
    indexTransformer,
    hasManyTransformer,
    hasOneTransformer,
    belongsToTransformer,
    new ConversationTransformer(modelTransformer, hasManyTransformer, belongsToTransformer, authTransformer),
    new GenerationTransformer(),
    authTransformer,
  ];

  // const processed = new GraphQLTransform({ transformers }).preProcessSchema(parse(inputSchema));
  // console.log(print(processed))

  const out = testTransform({
    schema: inputSchema,
    authConfig,
    transformers,
    dataSourceStrategies,
  });

  return out;
}

/*
    id: ID, name: String, metadata: AWSJSON): ConversationSession<name>

  client.conversations.startSession({ sessionId })
    --> query - getConversationSession<name>(id: ID!): ConversationSession<name>

    client.conversations.listSessions
    --> query - listConversationSession<pluralized-name>(filter: ModelConversationSessionpirateChatFilterInput, limit: Int, nextToken: String):

  session.onMessage
    --> subscription - onCreateConversationMessage<name>

    session.sendMessage
    --> mutation - createConversationMessage<name>

    session.listMessages
    --> query - listConversationMessagepirateChats
*/
