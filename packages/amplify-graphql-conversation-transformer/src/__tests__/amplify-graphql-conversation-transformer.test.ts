import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse, print } from 'graphql';
import { ConversationTransformer } from '..';
import { BelongsToTransformer, HasManyTransformer } from '../../../amplify-graphql-relational-transformer/src';

test('conversation route valid schema', () => {
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [],
  };

  const inputSchema = `
    type Mutation {
        pirateChat(sessionId: ID, message: String): String
        @conversation(aiModel: "Claude3Haiku")

        angryChat(sessionId: ID, message: String): String
        @conversation(aiModel: "Claude3Haiku")
    }
  `;

  const transformers = [
    new ModelTransformer(),
    new AuthTransformer(),
    new PrimaryKeyTransformer(),
    new HasManyTransformer(),
    new BelongsToTransformer(),
    new ConversationTransformer(),
  ];

  const processedDocumentNode  = new GraphQLTransform({ transformers }).preProcessSchema(parse(inputSchema));
  const processedSchema = print(processedDocumentNode);
  expect(processedSchema).toMatchSnapshot();

  const out = testTransform({
    schema: processedSchema,
    authConfig,
    transformers,
  });

  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
  expect(out.schema).toMatchSnapshot();
});


// test('conversation route valid schema', () => {
//   const authConfig: AppSyncAuthConfiguration = {
//     defaultAuthentication: {
//       authenticationType: 'AMAZON_COGNITO_USER_POOLS',
//     },
//     additionalAuthenticationProviders: [],
//   };

//   const inputSchema = `
//     type ConversationMessage_pirateChat
//     @model
//     @auth(rules: [{allow: owner, ownerField: "owner"}])
//     {
//         conversationSessionId: ID!
//         session: ConversationSession_pirateChat @belongsTo(references: "conversationSessionId")
//         sender: ConversationEventSender
//         text: String
//     }

//     type ConversationSession_pirateChat
//     @model
//     @auth(rules: [{allow: owner, ownerField: "owner"}])
//     {
//         events: [ConversationMessage_pirateChat] @hasMany(references: "conversationSessionId")
//     }

//     enum ConversationEventSender {
//         user
//         assistant
//     }

//     type Mutation {
//         pirateChat(sessionId: ID, message: String): String
//         @conversation(
//             aiModel: "Claude3Haiku",
//             sessionModel: { name: "ConversationSession_pirateChat" },
//             eventModel: { name: "ConversationMessage_pirateChat" }
//         )
//     }
//   `;

//   const out = testTransform({
//     schema: inputSchema,
//     authConfig,
//     transformers: [
//       new ModelTransformer(),
//       new AuthTransformer(),
//       new PrimaryKeyTransformer(),
//       new HasManyTransformer(),
//       new BelongsToTransformer(),
//       new ConversationTransformer(),
//     ],
//   });

//   expect(out).toBeDefined();
//   const schema = parse(out.schema);
//   validateModelSchema(schema);
//   expect(out.schema).toMatchSnapshot();
// });
