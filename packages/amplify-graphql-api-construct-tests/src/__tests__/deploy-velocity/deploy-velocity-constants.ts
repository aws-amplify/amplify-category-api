import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';

const ONE_MINUTE = 60 * 1000;
export const DURATION_10_MINUTES = 10 * ONE_MINUTE;
export const DURATION_20_MINUTES = 20 * ONE_MINUTE;
export const DURATION_30_MINUTES = 30 * ONE_MINUTE;
export const DURATION_1_HOUR = 60 * ONE_MINUTE;

export const COUNT_1_THOUSAND = 1000;
export const COUNT_10_THOUSAND = 10000;
export const COUNT_100_THOUSAND = 100000;

export const SCHEMA_ONE_FIELD_NO_INDEX = /* GraphQL */ `
  type Todo @model @auth(rules: [{ allow: public }]) {
    field1: String!
  }
`;

export const SCHEMA_ONE_FIELD_ALL_INDEXED = /* GraphQL */ `
  type Todo @model @auth(rules: [{ allow: public }]) {
    field1: String! @index
  }
`;

export const SCHEMA_THREE_FIELDS_NO_INDEX = /* GraphQL */ `
  type Todo @model @auth(rules: [{ allow: public }]) {
    field1: String!
    field2: String!
    field3: String!
  }
`;

export const SCHEMA_THREE_FIELDS_ALL_INDEXED = /* GraphQL */ `
  type Todo @model @auth(rules: [{ allow: public }]) {
    field1: String! @index
    field2: String! @index
    field3: String! @index
  }
`;

export const SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED = /* GraphQL */ `
  type Todo @model @auth(rules: [{ allow: public }]) {
    field1: String! @index
    field2: String! @index
    field3: String!
    field4: String!
  }
`;

export const SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED = /* GraphQL */ `
  type Todo @model @auth(rules: [{ allow: public }]) {
    field1: String!
    field2: String!
    field3: String! @index
    field4: String! @index
  }
`;

export const MUTATION_ONE_FIELD_CREATE = (uuid: string, i: number): string => `mut${i}: createTodo(input: { field1: "${uuid}" }) { id }`;

export const MUTATION_THREE_FIELD_CREATE = (uuid: string, i: number): string =>
  `mut${i}: createTodo(input: { field1: "${uuid}", field2: "${uuid}", field3: "${uuid}" }) { id }`;

export const MUTATION_FOUR_FIELD_CREATE = (uuid: string, i: number): string =>
  `mut${i}: createTodo(input: { field1: "${uuid}", field2: "${uuid}", field3: "${uuid}", field4: "${uuid}" }) { id }`;

export const API_POST_PROCESSOR_SET_PROVISIONED_THROUGHPUT_TWO_GSIS = (api: AmplifyGraphqlApi): void => {
  const table = api.resources.cfnResources.amplifyDynamoDbTables.Todo;
  table.billingMode = BillingMode.PROVISIONED; // This will require `BillingMode` be imported in the generated file.
  table.provisionedThroughput = { readCapacityUnits: 10, writeCapacityUnits: 10 };
};

export const MUTATION_ONE_FIELD_CREATE_STATIC = 'createTodo(input: { field1: "field1Value" }) { id }';

export const MUTATION_THREE_FIELD_CREATE_STATIC =
  'createTodo(input: { field1: "field1Value", field2: "field2Value", field3: "field3Value" }) { id }';

export const MUTATION_FOUR_FIELD_CREATE_STATIC =
  'createTodo(input: { field1: "field1Value", field2: "field2Value", field3: "field3Value", field4: "field4Value" }) { id }';
