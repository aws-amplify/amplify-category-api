import { Directive } from './directive';

const name = 'generation';
const definition = /* GraphQL */ `
  directive @${name}(
    aiModel: String!
    systemPrompt: String!
    inferenceConfiguration: InferenceConfiguration
  ) on FIELD_DEFINITION

  input InferenceConfiguration {
    maxTokens: Int
    temperature: Float
    topP: Float
  }
`;

const defaults = {};

export const GenerationDirective: Directive = {
  name,
  definition,
  defaults,
};
