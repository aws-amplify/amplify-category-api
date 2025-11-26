# GraphQL @multiTenant Transformer

# Reference Documentation

### @multiTenant

The `@multiTenant` directive provides automatic tenant-level data isolation.

#### Definition

```graphql
directive @multiTenant(
  tenantField: String = "tenantId"
  tenantIdClaim: String = "custom:tenantId"
) on OBJECT
```
