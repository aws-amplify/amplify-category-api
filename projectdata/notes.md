This is just a scratchpad to navigate through this projectdata folder.

## Benchmarking folder

This is the code that I used to create a bunch of fake data in DDB and then run my benchmarks. You will need to use `npm install` to add the deps and you'll need AWS credentials or a profile locally to run it and interact with your account as well.

Start at the end of the code and you'll see a `main()` which has some rudimentary args code that I never built out. The important bits you will need to uncomment out (or build out the CLI functionality more).

`init_table` - Just creates the *Movies* table in DDB.

`load_data` - This function grabs the `moviedata.json` and adds it into DDB using appended chars.

`query_item_count` - This is the important function to focus on as it has the core recursive logic to get a count over a query.

## Lambda

This is the Lambda function that runs as a Pipeline resolver in AppSync after a DynamoDB write operation for `mutation putMovie {}`. You will need to manually create a DDB table called **Aggregates** that has a Partition Key called **Type** of *STRING* and a Sort Key called **QueryExpression** of *STRING* as well. Ensure that you give your Lambda function write and read access to this DDB table.

Note that this logic is the Lambda version of `query_item_count` from the Benchmark above which is invoked in the `putMovie` Pipeline resolver outlined below.

## Schema

Should be simple but for the Data Sources on the Resolvers for Mutations and Queries you will need the following:
* `moviesByYearLetter` - Movies DynamoDB Table (**Unit Resolver**)
* `count_moviesByYearLetter` - Aggregates DynamoDB Table (**Unit Resolver**)
* `putMovie` - *Function1* is Movies DynamoDB table and *Function2* is Lambda_Aggregator using code in `./Lambda/index.js` (**Pipeline Resolver**)

*Note these Unit Resolvers can be Pipeline too*

## Resolvers

These follow the same naming convention that we have in GraphQL Transformer today. There are two VTL files for the Unit Resolvers and 4 for the Pipeline Resolver. The Before template is `{}` and After template is `$util.toJson($ctx.result)`.