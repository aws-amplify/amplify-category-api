# Aggregates POC

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

# EventBridge and RDS POCs

Schema is located in `./EventBridge-poc/resources/schema.graphql` for both of the projects

## Event Bridge Datasource

Use the `PutPerson` mutation field for testing this out at first.

The AppSync console doesn't support creating an HTTP API with an AWS Role for calling other AWS Services with Sigv4 Auth but you can do it via the AWS CLI or using CDK/CloudFormation. Here is how you do it with the CLI: https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-http-resolvers.html#invoking-aws-services
In the case of EventBridge the JSON file passed into `--http-config file:///http.json ` will be:

```json
{
  "endpoint": "https://events.us-east-2.amazonaws.com/",
  "authorizationConfig": {
      "authorizationType": "AWS_IAM",
      "awsIamConfig": {
          "signingRegion": "us-east-2",
          "signingServiceName": "events"
      }
  }
}
```
You'll need to create an appropriate IAM role too which 1) has a Trust Policy for AppSync and 2) can do PutEvents on Event Bridge

Of course we want to move this to CDK and here is a rough example that we might be able to use of that: https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/appsync-graphql-eventbridge/index.ts

I would recommend though not using the VTL in that template and instead use the VTL in `./EventBridge-poc/resources/resolver` and also in the **Rules** for the Bus changing the event pattern like this:

```json
{
  "source": ["com.amazon.appsync"]
}
```

The VTL and rules here will be much more flexible for our use case of ingesting dynamic events and GraphQL context for routing decisions later.


## RDS

Schema is in the same location: `./EventBridge-poc/resources/schema.graphql`.
For RDS use the `listContacts` query in your GraphQL schema to get started. You will probably need to tweak the Lambda to create some records first. Try to get basic CRUD working better than I did.

The Lambda is in `RES-poc/resources/lambda`. You will need a MySQL DB setup with RDS Proxy in the same VPC to get started. I don't have CDK code for that as I set it up manually but there are two links at the top in the comments of that Lambda function which should walk you through the process and then it can be automated in CDK after that. Note that we have a "global" VPC in GraphQL Transform which was added in the Fargate work from 2020 which can be re-used for this project, which we should do because getting the CIDR rules for subnet isolation in multi-envs was tricky and it would be a lot of work to redo all that. I'll walk you through the details.


There isn't a VTL for this as I used a direct Lambda resolver
