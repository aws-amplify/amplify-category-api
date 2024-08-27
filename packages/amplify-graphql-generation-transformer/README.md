# GraphQL @generation Transformer

## Reference Documentation

### @generation

The `@generation` directive allows you to quickly and easily create Generation AI Routes within your AWS AppSync API.

#### Definition

```graphql
directive @generation(aiModel: String!, systemPrompt: String!, inferenceConfiguration: GenerationInferenceConfiguration) on QUERY
```
