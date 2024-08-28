# Amplify GraphQL Generation Transformer

The Amplify GraphQL Generation Transformer is a tool that enables the quick and easy creation of AI-powered Generation routes within your AWS AppSync API. This transformer can be leveraged by using the `@generation` directive to configure AI models and system prompts for generating content.

## Installation

```bash
npm install @aws-amplify/graphql-generation-transformer
```

## Directive Definition

The `@generation` directive is defined as follows:

```graphql
directive @generation(aiModel: String!, systemPrompt: String!, inferenceConfiguration: GenerationInferenceConfiguration) on FIELD_DEFINITION
```

## Features

1. AI Model Integration: Specify the AI model to be used for generation.
2. System Prompt Configuration: Define a system prompt to guide the AI's output.
3. Inference Configuration: Fine-tune generation parameters like max tokens, temperature, and top-p.
4. Integrates with `@auth` Directive: Supports existing auth modes like IAM, API key, and Amazon Cognito User Pools.
5. Resolver Creation: Generates resolvers with tool definitions based on the Query field's return type to interact with the specified AI model.
6. Bedrock HTTP Data Source Creation: Creates a AppSync HTTP Data Source for Bedrock to interact with the specified AI model.

## Examples

### Basic Usage

#### Scalar Type Generation

```graphql
type Query {
  generateStory(topic: String!): String
    @generation(
      aiModel: "anthropic.claude-3-haiku-20240307-v1:0"
      systemPrompt: "You are a creative storyteller. Generate a short story based on the given topic."
    )
}
```

#### Complex Type Generation

```graphql
type Recipe {
  name: String!
  ingredients: [String!]!
  instructions: [String!]!
  prepTime: Int!
  cookTime: Int!
  servings: Int!
  difficulty: String!
}

type Query {
  generateRecipe(cuisine: String!, dietaryRestrictions: [String]): Recipe
    @generation(
      aiModel: "anthropic.claude-3-haiku-20240307-v1:0"
      systemPrompt: "You are a professional chef specializing in creating recipes. Generate a detailed recipe based on the given cuisine and dietary restrictions."
    )
}
```

### Advanced Configuration

```graphql
type Query {
  generateCode(description: String!): String
    @generation(
      aiModel: "anthropic.claude-3-haiku-20240307-v1:0"
      systemPrompt: "You are an expert programmer. Generate code based on the given description."
      inferenceConfiguration: { maxTokens: 500, temperature: 0.7, topP: 0.9 }
    )
}
```

## Limitations

- The `@generation` directive can only be used on Query fields.
- The AI model specified must:
  - be supported by Amazon Bedrock's /converse API
  - support tool usage
- Some AppSync scalar types are not currently supported.
