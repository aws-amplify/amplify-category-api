# amplify-auth-drt

## Purpose

This package uses Differential Random Testing to compare results of Amplify's production fine-grained authorization implementation with models written in [Cedar][https://www.cedarpolicy.com/].

The models are intentionally simplified versions of the auth implementation.

Input generation via [fast-check](https://github.com/dubzzz/fast-check).

## Tenets (unless you know better ones)

- **The model is the spec.** The auth specification should be understandable by humans and analyzable by machines.
- **The model is exhaustive.** The spec should eventually cover all auth cases. Where we identify gaps in the model's coverage, we will work to close them.
- **Testing is fast.** Tests should be quick to run, and parallelizable. We should be able to execute these tests regularly to ensure we have coverage without dramatically impacting our ability to release.

## Test execution

A typical test run will work like this:

**Fixtures**

1. An Amplify project definition in CDK format, including:
   - GraphQL schema
   - Fully-specified auth configuration (e.g., a configured user pool)
2. A Cedar model configuration including:
   - A policy set describing the auth rules
   - A schema. As a high-level description of the Amplify auth framework, this should be shareable amongst all tests.
3. Common fixture data:
   - Request, including principal, action, resource, context
   - Expected results, which could be a concrete allow/deny decision, or a partially evaluated result (e.g., a Cedar residual or a query expression)

**Test loop**

1. Invoke the Amplify transformer for the specified case
1. The output of the above step will include mapping templates for resolving an operation
1. For each set of random data:
   1. Use the fixture data to invoke the [AppSync `EvaluateMappingTemplate` API](https://docs.aws.amazon.com/appsync/latest/APIReference/API_EvaluateMappingTemplate.html). Remember this result as `actualResult`.
   1. Use the fixture data to invoke the model. Remember this result as `modelResult`
   1. Expect `actualResult` to equal `modelResult`
   1. Note that the results may not be concrete decisions -- some cases rely on an evaluation of the actual data. In that case we expect AppSync evaluation to return a "filter expression" and the model to return a "residual". We will have utilities to compare those to assert they are equal.
