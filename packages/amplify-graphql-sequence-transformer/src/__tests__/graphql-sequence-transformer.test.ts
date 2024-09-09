import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
import { SequenceTransformer, ERR_NOT_INT, ERR_NOT_MODEL, ERR_NOT_POSTGRES, ERR_ARGC } from '../graphql-sequence-transformer';
import { constructDataSourceStrategies, POSTGRES_DB_TYPE, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';

describe('SequenceTransformer:', () => {
  it('throws if @sequence is used in a non-@model type', () => {
    const schema = `
      type Test {
        id: ID! @sequence
        name: String
      }`;

    expect(() =>
      testTransform({
        schema,
        transformers: [new ModelTransformer(), new SequenceTransformer()],
      }),
    ).toThrow(ERR_NOT_MODEL);
  });

  it.each([
    { strategy: mockSqlDataSourceStrategy() },
    // TODO: DTE Mock DynamoDB?
  ])('throws if @sequence is used on a non Postgres datasource', ({ strategy }) => {
    const schema = `
      type CoffeeQueue @model {
        id: ID! @primaryKey
        orderNumber: Int! @sequence
        name: String
      }`;
    expect(() => {
      testTransform({
        schema: schema,
        transformers: [new ModelTransformer(), new SequenceTransformer(), new PrimaryKeyTransformer()],
        dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
      });
    }).toThrow(ERR_NOT_POSTGRES);
  });

  it.each([
    { typeStr: 'Boolean' },
    { typeStr: 'AWSJSON' },
    { typeStr: 'AWSDate' },
    { typeStr: 'AWSDateTime' },
    { typeStr: 'AWSTime' },
    { typeStr: 'AWSTime' },
    { typeStr: 'AWSURL' },
    { typeStr: 'AWSPhone' },
    { typeStr: 'AWSIPAddress' },
  ])('throws if @sequence is used on non-int types', ({ typeStr }) => {
    expect(() => {
      const schema = `
      type Test @model {
        id: ID!
        value: ${typeStr} @sequence
      }
    `;
      testTransform({
        schema,
        transformers: [new ModelTransformer(), new SequenceTransformer()],
      });
    }).toThrow(ERR_NOT_INT);
  });

  it('should successfully transform simple valid schema', async () => {
    const postgresStrategy = mockSqlDataSourceStrategy({ dbType: POSTGRES_DB_TYPE });

    const inputSchema = `
      type CoffeeQueue @model {
        id: ID! @primaryKey
        orderNumber: Int! @sequence
        name: String
      }
    `;
    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new SequenceTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(inputSchema, postgresStrategy),
    });
    expect(out).toBeDefined();
    expect(out.schema).toMatchSnapshot();

    const schema = parse(out.schema);
    validateModelSchema(schema);
  });
});
