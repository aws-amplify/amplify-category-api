---
'@aws-amplify/graphql-model-transformer': patch
'@aws-amplify/graphql-api-construct': patch
'@aws-amplify/data-construct': patch
---

fix: let an Amplify-managed table delete succeed when its create never completed

When CloudFormation cancels a `Custom::AmplifyDynamoDBTable` create before the table manager returns a table name (for example, because another resource in the stack failed), the resource's physical ID is a CloudFormation-generated placeholder. On delete, the table manager called `DescribeTable` on that placeholder. Its role may only access this API's tables, so the call was denied instead of returning `ResourceNotFoundException`, and the stack stayed in `DELETE_FAILED` on every retry, keeping the GraphQL API and the rest of the stack alive.

The delete now completes when the physical ID is not the resource's table name and `DescribeTable` is denied: no table was created for the resource, so there is nothing to delete. A denied call for the resource's own table still fails the delete, and a table that exists is still deleted.
