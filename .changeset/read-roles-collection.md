---
'@aws-amplify/graphql-auth-transformer': patch
---

fix: collect roles from all read operations

The set of read roles used when generating field-level authorization resolvers is now built from every read operation (get, list, search, listen, sync) instead of only the first. A field with a field-level rule now gets its field resolver whenever any role can read the model. Run `amplify push` to regenerate resolvers.
