import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, GraphQLTransform, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse, print } from 'graphql';
import { ConversationTransformer } from '..';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import { FunctionTransformer } from '../../../amplify-graphql-function-transformer/src';
import { QueryDefinition } from 'aws-cdk-lib/aws-logs';
import { Subscription } from 'aws-cdk-lib/aws-sns';

test('conversation route valid schema', () => {
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [],
  };

  const inputSchema = `
    type Foo
      @model(
        mutations: { update: null },
        subscriptions: { level: off }
      )
      @auth(
        rules: [{ allow: owner }]
      )
    {
      bar: Int
    }

    type Mutation {
        pirateChat(id: ID, sessionId: ID!, content: String): String
        @conversation(aiModel: "Claude3Haiku", functionName: "conversation-handler")
    }
  `;

  const modelTransformer = new ModelTransformer();
  const authTransformer = new AuthTransformer();
  const indexTransformer = new IndexTransformer();
  const hasOneTransformer = new HasOneTransformer();
  const belongsToTransformer = new BelongsToTransformer();
  const hasManyTransformer = new HasManyTransformer();

  const transformers = [
    modelTransformer,
    new FunctionTransformer(),
    new PrimaryKeyTransformer(),
    indexTransformer,
    hasManyTransformer,
    hasOneTransformer,
    belongsToTransformer,
    new ConversationTransformer(modelTransformer, hasManyTransformer, belongsToTransformer, authTransformer),
    authTransformer,
  ];

  const out = testTransform({
    schema: inputSchema,
    authConfig,
    transformers,
    dataSourceStrategies: {
      Foo: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    },
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.schema).toMatchSnapshot();
  expect(out.resolvers).toBeDefined();
  expect(out.resolvers).toMatchSnapshot();
});

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
