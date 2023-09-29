# AmplifyGraphqlApi Construct Tests

This packages contains end to end tests that are run in Codebuild to ensure that your changes are not breaking the CDK construct. Each test in this package creates resources in the cloud.

## Setup

### Package Up Construct

In order to test locally, you must first package the construct, this is done by running the `yarn package` step in your repo.

**N.B. this must be done every time you update any code related to the construct**.

```sh
# If building from scratch
yarn build
cd packages/amplify-graphql-api-construct
yarn package

# If only rebuilding construct code (much faster)
cd packages/amplify-graphql-api-construct
yarn build
yarn package
```

### Set up credentials

To run the tests locally, you need to have your AWS credentials stored in a `.env` file of this package. These values are used to configure the test projects.

Please see sample.env for the keys that are expected in your `.env` file.

The `.env` file does not get commited as its in the `.gitignore` file.

## Running individual tests

Amplify E2E tests use Jest. So all the standard Jest comnmads work.
You can run a single test while adding a new test by running

```bash
cd <REPO_ROOT>/packages/amplify-graphql-api-construct-tests/
npm run e2e src/__tests__/init.test.ts
```

## Writing a new integration test

E2E tests internally use a forked version of [nexpect](https://www.npmjs.com/package/nexpect) to run the CLI. There are helper methods that helps you to set up and delete project. The recommended pattern is to create a helper method that creates a resources as a helper method so these method could be used in other tests. For instance, `initJSProjectWithProfile` is a helper method that is used in `init` tests and also used in all the other tests to initalize a new Javascript project. The tests should have all the assertions to make sure the resource created by the helper method is setup correctly. We recommend using `aws-sdk` to make assert the resource configuration.

If you want to log the test results for debugging, set the environment variable `VERBOSE_LOGGING_DO_NOT_USE_IN_CI_OR_YOU_WILL_BE_FIRED` to `true` and output logs will be written to temp files. The temp file paths will be printed as the tests run and you can `cat` or `tail` the logs to see the CLI output

```sh
env VERBOSE_LOGGING_DO_NOT_USE_IN_CI_OR_YOU_WILL_BE_FIRED=true yarn e2e
```
