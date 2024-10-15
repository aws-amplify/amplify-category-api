# AmplifyDatabase Construct Tests

This packages contains end to end tests that are run in Codebuild to ensure that your changes are not breaking the Amplify Database CDK constructs.
Each test in this package creates resources in the cloud.

## Setup

### Package Up Construct

In order to test locally, you must first package the construct, this is done by running the `yarn package` step in your repo.

**N.B. this must be done every time you update any code related to the construct**.

```sh
# If building from scratch
yarn build
yarn package

# If only rebuilding construct code (much faster)
cd packages/amplify-database-construct
yarn build
yarn package
```

## Running individual tests

Amplify E2E tests use Jest. So all the standard Jest comnmads work.
You can run a single test while adding a new test by running

```bash
cd <REPO_ROOT>/packages/amplify-graphql-api-construct-tests/
npm run e2e src/__tests__/init.test.ts
```
