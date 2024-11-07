# GraphQL @resolver Transformer

# Reference Documentation

### @resolver

The `@resolver` directive allows you to quickly and easily configure JS pipeline
resolvers within your AWS AppSync API.

#### Definition

```graphql
directive @resolver(functions: [{ dataSource: String, entry: String}]) on FIELD_DEFINITION
```
