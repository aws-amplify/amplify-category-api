import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform, constructDataSourceStrategies, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { DocumentNode, Kind, parse } from 'graphql';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { ConversationTransformer } from '..';
import { HasManyTransformer, BelongsToTransformer } from '../../../amplify-graphql-relational-transformer/src';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';

test('fails if @belongsTo was used on an object that is not a model type', () => {
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [],
  };

  const inputSchema = `
    type ConversationMessage_pirateChat
    @model
    @auth(rules: [{allow: owner, ownerField: "owner"}])
    {
        conversationSessionId: ID!
        session: ConversationSession_pirateChat @belongsTo(references: "conversationSessionId")
        sender: ConversationEventSender
        text: String
    }

    type ConversationSession_pirateChat
    @model
    @auth(rules: [{allow: owner, ownerField: "owner"}])
    {
        events: [ConversationMessage_pirateChat] @hasMany(references: "conversationSessionId")
    }

    enum ConversationEventSender {
        user
        assistant
    }

    type Mutation {
        pirateChat(sessionId: ID, message: String): String
        @conversation(
            aiModel: "Claude3Haiku",
            sessionModel: { name: "ConversationSession_pirateChat" },
            eventModel: { name: "ConversationMessage_pirateChat" }
        )
    }
  `;

  const out = testTransform({
    schema: inputSchema,
    authConfig,
    transformers: [
      new ModelTransformer(),
      new AuthTransformer(),
      new PrimaryKeyTransformer(),
      new HasManyTransformer(),
      new BelongsToTransformer(),
      new ConversationTransformer(),
    ],
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.schema).toMatchSnapshot();
});
