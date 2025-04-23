import { Directive } from './directive';

const name = 'conversation';
const definition = /* GraphQL */ `
  directive @${name}(
    aiModel: String!
    systemPrompt: String!
    auth: ConversationAuth!
    functionName: String
    handler: ConversationHandlerFunctionCustomConfiguration
    defaultHandlerSettings: ConversationHandlerFunctionDefaultConfiguration
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

  input ConversationHandlerFunctionCustomConfiguration {
    functionName: String!
    eventVersion: String!
  }

  input ConversationHandlerFunctionDefaultConfiguration {
    logging: {
      level: ApplicationLogLevel;
      retention: RetentionDays;
    };
    timeoutSeconds: number;
    memoryMB: number;
  }
  
  # The configuration for a tool.
  # This is a fake union (GraphQL doesn't support unions in inputs). It is best thought of as:
  # type ToolMap =
  #  ({ queryName: string; } | { modelName: string; modelOperation: ConversationToolModelOperation; })
  #  & { name: string; description: string; }
  # The conversation transformer validates the input to ensure it conforms to the expected shape.
  input ToolMap {
    # The name of the tool. This is included in the tool definition provided to the AI model.
    name: String!
    # The description of the tool. This is included in the tool definition provided to the AI model.
    description: String!

    # The name of the GraphQL query that is invoked when the tool is used.
    queryName: String

    # The name of the Amplify model used by the tool.
    modelName: String
    # The model generated operation for the provided Amplify model that is invoked when the tool is used.
    modelOperation: ConversationToolModelOperation
  }

  # The model generated operation for the provided Amplify model.
  enum ConversationToolModelOperation {
    list
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
