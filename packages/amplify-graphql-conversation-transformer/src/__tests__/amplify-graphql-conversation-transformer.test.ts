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

test('conversation route valid schema', () => {
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [],
  };

  const inputSchema = `
    type Foo @model {
      bar: Int
    }

    type Mutation {
        pirateChat(sessionId: ID, message: String): String
        @function(name: "abc")
        @conversation(aiModel: "Claude3Haiku")
    }
  `;

  // angryChat(sessionId: ID, message: String): String
        // @conversation(aiModel: "Claude3Haiku")

  // const modelTransformer = new ModelTransformer();
  // const authTransformer = new AuthTransformer();
  // const hasManyTransformer = new HasManyTransformer();
  // const belongsToTransformer = new BelongsToTransformer();

  // const transformers = [
  //   modelTransformer,
  //   new PrimaryKeyTransformer(),
  //   new IndexTransformer(),
  //   hasManyTransformer,
  //   belongsToTransformer,
  //   new ConversationTransformer(modelTransformer, authTransformer),
  //   authTransformer,
  // ];

  const modelTransformer = new ModelTransformer();
  const authTransformer = new AuthTransformer();
  const indexTransformer = new IndexTransformer();
  const hasOneTransformer = new HasOneTransformer();
  const belongsToTransformer = new BelongsToTransformer();
  const hasManyTransformer = new HasManyTransformer();
  // The default list of transformers should match DefaultDirectives in packages/amplify-graphql-directives/src/index.ts
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
  ]

  // const processedDocumentNode  = new GraphQLTransform({ authConfig, transformers }).preProcessSchema(parse(inputSchema));
  // const processedSchema = print(processedDocumentNode);
  // expect(processedSchema).toMatchSnapshot();

  const out = testTransform({
    schema: inputSchema,
    authConfig,
    transformers,
    dataSourceStrategies: {
      'Foo': DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY
    }
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
