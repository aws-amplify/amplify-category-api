# GraphQL @multiTenant Transformer

# Reference Documentation

### @multiTenant

The `@multiTenant` directive provides automatic tenant-level data isolation.

#### Definition

```graphql
directive @multiTenant(
  tenantField: String = "tenantId"
  tenantIdClaim: String = "custom:tenantId"
  lookupModel: String
  lookupKey: String
  lookupClaim: String
  lookupOutputField: String
) on OBJECT
```

#### DynamoDB Lookup Configuration

You can configure the transformer to look up allowed tenant IDs from a DynamoDB table instead of relying solely on JWT claims. This is useful when a user belongs to multiple tenants or when tenant membership is managed dynamically.

```graphql
type UserTenant @model {
  userId: ID! @primaryKey
  tenantIds: [String]
}

type Todo @model @multiTenant(
  lookupModel: "UserTenant"
  lookupKey: "userId"
  lookupClaim: "sub"
  lookupOutputField: "tenantIds"
) {
  id: ID!
  content: String
}
```

In this configuration:
1. The transformer injects a lookup operation using the `UserTenant` table.
2. It uses the `sub` claim from the JWT to query the `UserTenant` table (via `userId` key).
3. It retrieves the list of tenants from the `tenantIds` field.
4. It validates that the `tenantId` of the `Todo` item is present in this list.
