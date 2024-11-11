import { Directive } from './directive';

const name = 'conversation';
const definition = /* GraphQL */ `
  directive @${name}(
    aiModel: String!
    systemPrompt: String!
    auth: ConversationAuth!
    functionName: String
    handler: ConversationHandlerFunctionConfiguration
    tools: [ToolMap]
    inferenceConfiguration: ConversationInferenceConfiguration
  ) on FIELD_DEFINITION

  input ConversationAuth {
    strategy: ConversationAuthStrategy!
    provider: ConversationAuthProvider!
  }

  enum ConversationAuthStrategy {
    owner
  }

  enum ConversationAuthProvider {
    userPools
  }

  input ConversationHandlerFunctionConfiguration {
    functionName: String!
    eventVersion: String!
  }

  input ToolMap {
    name: String
    description: String
  }

  input ConversationInferenceConfiguration {
    maxTokens: Int
    temperature: Float
    topP: Float
  }
`;

const defaults = {};

export const ConversationDirective: Directive = {
  name,
  definition,
  defaults,
};
