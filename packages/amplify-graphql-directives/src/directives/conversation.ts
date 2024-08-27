import { Directive } from './directive';

const name = 'conversation';
const definition = /* GraphQL */ `
  directive @${name}(
    aiModel: String!
    systemPrompt: String!
    functionName: String
    tools: [ToolMap]
    inferenceConfiguration: ConversationInferenceConfiguration
  ) on FIELD_DEFINITION

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
