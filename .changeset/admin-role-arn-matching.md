---
'@aws-amplify/graphql-auth-transformer': patch
'@aws-amplify/amplify-category-api': patch
---

fix: match admin roles on the assumed-role name segment of the caller ARN

Admin-role matching for IAM-authorized GraphQL APIs is now anchored to the caller's assumed-role name, so an admin role name that appears elsewhere in the caller ARN no longer grants admin access. As part of this, a function granted API access is matched by its Lambda execution role name rather than its function name.

After upgrading, run `amplify push` to regenerate the resolvers; until then existing deployments keep their current behavior. A function whose execution role name cannot be resolved is not granted admin access and a warning naming it is printed — adding that role name to `adminRoleNames` in `custom-roles.json` restores access.
