# Aggregates Demo Stack

## Overview

This is a CDK project which allows for quick reproduction of a test app which can vend ddb-based data aggregates over appsync. It consists of a fairly simple Stack called ``, and then just vanilla lambda, schema, and resolver resources which get injected into the application to make it function. There is currently no transformer directive support for this in amplify cli yet.

### Pre-requisites

1. CDK is installed.
2. You have access to an aws account to deploy this stack into.

### Useful commands

* `npm install`               install local deps required to run cdk tasks
* `npm run build`             compile typescript to js (not required for lambda/resolver/schema updates, just execute a `cdk deploy`)
* `npm run watch`             watch for changes and compile
* `npm run clean`             remove temp cdk, node_modules, and package-lock files
* `cdk deploy`                deploy this stack to your default AWS account/region
* `cdk deploy --profile <TK>` deploy this stack to a named profile found in your ~/.aws/config|credentials file.
* `cdk diff`                  compare deployed stack with current state
* `cdk synth`                 emits the synthesized CloudFormation template

## Resources

### Lambdas

There are 3 lambdas defined in this project. The only one used in the normal operation of the API is `computeAggregates`, which is part of the pipeline resolver on `put` for the movies table.

The other two are primarily used to seed test data and run test queries. These are `generateMockData` and `benchmarkQueries` respectively. These can be triggered manually by registering test events via the console.

Note that this logic is the Lambda version of `queryItemCount` from the Benchmark above which is invoked in the `putMovie` Pipeline resolver outlined below.

#### Running test lambdas

To run the generateMockData lambda, just enter an event like `{}`.

To run the benchmarkQueries lambda, enter an event like `{ "year": 2040, "letter1": "A", "letter2": "Z" }`.

### Schema

Should be simple but for the Data Sources on the Resolvers for Mutations and Queries you will need the following:
* `moviesByYearLetter` - Movies DynamoDB Table (**Unit Resolver**)
* `count_moviesByYearLetter` - Aggregates DynamoDB Table (**Unit Resolver**)
* `putMovie` - *Function1* is Movies DynamoDB table and *Function2* is a lambda using code in `./resources/lambda/computeAggregates/index.js` (**Pipeline Resolver**)

*Note these Unit Resolvers can be Pipeline too*

### Resolvers

These follow the same naming convention that we have in GraphQL Transformer today. There are two VTL files for the Unit Resolvers and 4 for the Pipeline Resolver. These are consumed automatically by CDK and attached to the API.

## Example Usage

The following queries can be used to demo the resolver set up.

```graphql
mutation InsertAndSideEffectCompute {
  putMovie(title: "the matrix", year: 2040) {
    title
    year
  }
}

query GetRecordsBySearchParams {
  moviesByYearLetter(letter1: "A", letter2: "D", year: 2040) {
    title
    year
  }
}

query GetPrecomputedCount {
  count_moviesByYearLetter(model: "movies", queryExpression: "moviesByYearLetter") {
    count
  }
}
```