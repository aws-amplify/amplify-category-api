# Amplify Database Construct

[![View on Construct Hub](https://constructs.dev/badge?package=%40aws-amplify%2Fdatabase-construct)](https://constructs.dev/packages/@aws-amplify/database-construct)

This package vends an L3 CDK Construct to create a Aurora DB cluster for the Amplify GraphQL API.

## Examples

### Basic Example

TODO

```ts
import { AmplifyDatabaseCluster } from '@aws-amplify/database-construct';
import { AmplifyGraphQLAPI } from '@aws-amplify/graphql-api-construct';

const databaseCluster = new AmplifyDatabaseCluster({
  dbType: 'POSTGRES',
});

const dbManager = AmplifyDatabaseManager({
  databaseCluster,
});

dbManager.sqlStatment('create Todo table sql statement');

const schema = `
  type Todo @model {
    content: String
  }
`;

new AmplifyGraphQLAPI({
  definition: AmplifyGraphqlDefinition.fromString(
    // graphql schema needs to match databaseCluster sql schema
    // gen 2 will provide compile time type checking
    schema,
    databaseCluster.dataSourceStrategy,
  ),
});
```
