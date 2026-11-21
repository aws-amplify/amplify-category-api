---
'@aws-amplify/graphql-auth-transformer': patch
'@aws-amplify/graphql-api-construct': patch
---

fix: authorize mutation condition fields against read permission

Update and delete mutations now authorize the fields named in the `condition`
argument, not only the fields in `input`. A field referenced in a condition is
rejected unless the caller is authorized to read it, matching the read access
granted by field-level `@auth`. The check applies at any nesting depth within
`and` / `or` / `not`, and covers both the update and delete resolvers.

Upgrade note: a mutation that supplies a `condition` on a field the caller is not
authorized to read now returns an `Unauthorized` error instead of running. The
record's own primary key, timestamps, and any field without a field-level read
restriction remain usable in a condition.
