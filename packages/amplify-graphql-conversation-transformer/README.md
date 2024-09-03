# GraphQL @conversation Transformer

The `@conversation` transformer is a powerful tool for quickly and easily creating AI-powered conversation routes within your AWS AppSync API. This transformer leverages the capabilities of large language models to enable dynamic, context-aware conversations in your GraphQL schema.

## Table of Contents

- [GraphQL @conversation Transformer](#graphql-conversation-transformer)
  - [Table of Contents](#table-of-contents)
  - [Directive Definition](#directive-definition)
  - [Usage](#usage)
  - [Configuration Options](#configuration-options)
  - [Generated Resources](#generated-resources)
  - [Examples](#examples)
    - [Basic Usage](#basic-usage)
    - [Advanced Usage with Tools and Inference Configuration](#advanced-usage-with-tools-and-inference-configuration)
  - [Best Practices](#best-practices)
  - [Troubleshooting](#troubleshooting)

## Directive Definition

The `@conversation` directive is defined as follows:

```graphql
directive @conversation(
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
```

## Usage

To use the `@conversation` directive, add it to a field in your GraphQL schema. This field should be of type `ConversationMessage` and should be part of the `Mutation` type.

```graphql
type Mutation {
  sendMessage(conversationId: ID!, content: String!): ConversationMessage
    @conversation(aiModel: "anthropic.claude-3-haiku-20240307-v1:0", systemPrompt: "You are a helpful AI assistant.")
}
```

To find the necessary GraphQL types to use with the `@conversation` directive, see `src/graphql-types/conversation-schema-types.ts`.

## Configuration Options

The `@conversation` directive accepts the following configuration options:

- `aiModel` (required): Specifies the AI model to be used for generating responses.
- `systemPrompt` (required): Defines the initial prompt that sets the context for the AI model.
- `functionName` (optional): Specifies a custom Lambda function to handle the conversation logic.
- `tools` (optional): An array of tool configurations that the AI can use during the conversation.
- `inferenceConfiguration` (optional): Fine-tunes the AI model's behavior with parameters like `maxTokens`, `temperature`, and `topP`.

## Generated Resources

When you use the `@conversation` directive, the transformer generates several AWS resources to support the conversation functionality:

1. DynamoDB Tables:

   - A table for storing conversation sessions
   - A table for storing individual messages

2. AppSync Resolvers:

   - A pipeline resolver for the conversation mutation
   - A resolver for the assistant's response mutation
   - A subscription resolver for real-time updates

3. Lambda Function:

   - A default conversation handler (if no custom `functionName` is provided)

4. IAM Roles and Policies:

   - Necessary permissions for AppSync to interact with DynamoDB and Lambda

5. AppSync Data Sources:
   - DynamoDB data sources for conversation and message tables
   - Lambda data source for the conversation handler

## Examples

### Basic Usage

```graphql
type Mutation {
  chat(conversationId: ID!, message: String!): ConversationMessage
    @conversation(
      aiModel: "anthropic.claude-3-haiku-20240307-v1:0"
      systemPrompt: "You are a friendly AI assistant. Respond to user queries in a helpful and concise manner."
    )
}
```

### Advanced Usage with Tools and Inference Configuration

```graphql
type Mutation {
  customerSupport(conversationId: ID!, inquiry: String!): ConversationMessage
    @conversation(
      aiModel: "anthropic.claude-3-haiku-20240307-v1:0"
      systemPrompt: "You are a customer support AI. Help users with their product inquiries and issues."
      tools: [
        { name: "getProductInfo", description: "Retrieves detailed information about a product" }
        { name: "checkOrderStatus", description: "Checks the status of a customer's order" }
      ]
      inferenceConfiguration: { maxTokens: 500, temperature: 0.7, topP: 0.9 }
    )
}
```

## Best Practices

1. **Craft Clear System Prompts**: The system prompt sets the tone and context for the conversation route. Make it specific and aligned with your use case.

2. **Use Appropriate AI Models**: Choose AI models that suit your application's needs in terms of capabilities and response time.

3. **Implement Error Handling**: Always handle potential errors client-side code.

4. **Monitor and Optimize**: Regularly review the performance and costs associated with your conversation route.

## Troubleshooting

If you encounter issues while using the `@conversation` transformer, consider the following:

1. **Check Your Schema**: Ensure your GraphQL schema is valid and the `@conversation` directive is used correctly.

2. **Verify AWS Resources**: Check that all required AWS resources have been created successfully.

3. **Review Logs**: Examine CloudWatch logs for any errors in your Lambda functions or AppSync resolvers.

4. **Test Incrementally**: When adding complex features like custom tools, test each addition incrementally to isolate potential issues.
