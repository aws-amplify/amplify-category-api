---
'@aws-amplify/data-construct': patch
'@aws-amplify/graphql-api-construct': patch
---

fix: align bundled OpenTelemetry packages so `npm ci` succeeds

The bundled `@opentelemetry/resources` and `@opentelemetry/sdk-trace-base` move to 2.8.0, matching the bundled `@opentelemetry/core@2.8.0`. Previously they were 2.0.0 and required exactly `core@2.0.0`, which the bundle did not contain. As a result, `npm ci` failed on a lockfile written by `npm install` with `Missing: @opentelemetry/core@2.0.0 from lock file`, and `npm ls` reported `@opentelemetry/core` as invalid. This also happened on a fresh `npm create amplify@latest` project.
