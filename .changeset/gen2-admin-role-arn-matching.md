---
'@aws-amplify/graphql-auth-transformer': patch
'@aws-amplify/graphql-api-construct': patch
---

fix: match admin roles on the assumed-role name segment of the caller ARN

Admin-role matching for IAM-authorized GraphQL APIs is now anchored to the caller's assumed-role name, so an admin role name that appears elsewhere in the caller ARN (for example in a caller-chosen role session name) no longer grants admin access. The allow-listed roles supplied to the construct through `iamConfig.allowListedRoles` (and the deprecated `adminRoles`) are matched against the `:assumed-role/<RoleName>/` segment of the caller identity.

An `allowListedRoles` entry given as an `assumed-role` ARN string is reduced to its role-name segment, and a plain IAM role ARN string is now rejected with a clear error because it never appears in the caller identity and would otherwise silently grant nothing. Passing a role name (or an `IRole`) is unchanged.
