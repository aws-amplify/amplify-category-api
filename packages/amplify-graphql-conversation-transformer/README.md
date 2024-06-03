# GraphQL @conversation Transformer

## Reference Documentation

### @conversation

The `@conversation` directive allows you to quickly and easily create Conversation AI Routes within your AWS AppSync API.

#### Definition

```graphql
directive @conversation(aiModel: String, sessionModel: SessionModel, eventModel: EventModel) on MUTATION
```
