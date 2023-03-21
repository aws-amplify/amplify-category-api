# Amplify GraphQL Schema Validator

This package contains logic used by AWS Amplify development teams to validate
that customer's `schema.graphql` for their Amplify app is valid.

## Contributing

To add a validator, simply create a new `*.ts` file under `src/validators`
exporting a function named `validate` that takes a `DocumentNode` object and
returns void if successful, and returns an array of actionable `ValidationError` objects if not.

Validators should be pure functions that do not depend on or mutate state.

Once your validator is ready, update `src/index.ts` and import your validator
there.

Ensure your validator is tested and conforms to our coverage standards.
