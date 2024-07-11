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
        pirateChat(sessionId: ID, message: String): String
        @auth(rules: [{ allow: owner }])
        @conversation(aiModel: "Claude3Haiku")
    }
  `;

   // @function(name: "abc")
  // @auth(rules: [{ allow: owner }])

/*

  type ConversationSession<name> {
    id: ID!
    name: String
    metadata: AWSJSON
    messages(filter: ModelConversationMessage<name>FilterInput, sortDirection: ModelSortDirection, limit: Int, nextToken: String): ModelConversationMessagepirateChatConnection
    createdAt: AWSDateTime!
    updatedAt: AWSDateTime!
    owner: String
  }


  client.conversations.startSession
    createConversationSession<name>(input: CreateConversationSession<name>Input!, condition: ModelConversationSession<name>ConditionInput): ConversationSession<name>

    input CreateConversationSession<name>Input {
      id: ID
      name: String
      metadata: AWSJSON
    }

    input ModelConversationSession<name>ConditionInput {
      name: ModelStringInput
      metadata: ModelStringInput
      and: [ModelConversationSession<name>ConditionInput]
      or: [ModelConversationSession<name>ConditionInput]
      not: ModelConversationSession<name>ConditionInput
      createdAt: ModelStringInput
      updatedAt: ModelStringInput
      owner: ModelStringInput
    }

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

  expect(out.resolvers).toBeDefined();
  expect(out.resolvers).toMatchSnapshot();
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
