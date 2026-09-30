---
'@aws-amplify/graphql-auth-transformer': patch
'@aws-amplify/graphql-api-construct': patch
---

fix: match admin roles on the assumed-role name segment of the caller ARN

Admin-role matching for IAM-authorized GraphQL APIs is anchored to the caller's assumed-role name. Allow-listed roles supplied through `iamConfig.allowListedRoles` (and the deprecated `adminRoles`) are matched against the `:assumed-role/<RoleName>/` segment of the caller identity.

Each entry must be role-name shaped, either `<RoleName>` or `<RoleName>/<SessionName>`. An entry given as an `assumed-role` ARN string is reduced to its role-name segment automatically. An entry of any other ARN form is dropped with a warning, since an ARN does not appear in the caller identity and would grant nothing. A role name string or an `IRole` is passed through unchanged.

Upgrade note: entries that are not role-name shaped no longer grant admin access after this change. Review your `allowListedRoles`/`adminRoles` and convert them to the role-name form:

- Before: `arn:aws:iam::123456789012:role/MyAdminRole` (dropped now)
- After: `MyAdminRole`

An entry that relied on matching only a session name (for example a Lambda function name) or on matching a partial role name or account id will no longer match and should be replaced with the `<RoleName>` (or `<RoleName>/<SessionName>`) it is meant to allow.
