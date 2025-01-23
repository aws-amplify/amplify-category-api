import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('Numeric Validation Types', () => {
  describe('Invalid usage', () => {
    test.each([
      {
        name: 'rejects empty value',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float! @validate(type: gt, value: "")
            score: Int! @validate(type: lt, value: "")
            counts: [Float]! @validate(type: gte, value: "")
            numbers: [Int]! @validate(type: lte, value: "")
          }
        `,
        error: "gt value must be a number. Received '' for field 'rating'",
      },
      {
        name: 'rejects space value',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float! @validate(type: gt, value: " ")
            score: Int! @validate(type: lt, value: " ")
            counts: [Float]! @validate(type: gte, value: " ")
            numbers: [Int]! @validate(type: lte, value: " ")
          }
        `,
        error: "lt value must be a number. Received ' ' for field 'rating'",
      },
      {
        name: 'rejects NaN value',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float! @validate(type: gt, value: "NaN")
            score: Int! @validate(type: lt, value: "NaN")
            counts: [Float]! @validate(type: gte, value: "NaN")
            numbers: [Int]! @validate(type: lte, value: "NaN")
          }
        `,
        error: "gte value must be a number. Received 'NaN' for field 'rating'",
      },
      {
        name: 'rejects null value',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float! @validate(type: gt, value: "null")
            score: Int! @validate(type: lt, value: "null")
            counts: [Float]! @validate(type: gte, value: "null")
            numbers: [Int]! @validate(type: lte, value: "null")
          }
        `,
        error: "lte value must be a number. Received 'null' for field 'rating'",
      },
      {
        name: 'rejects undefined value',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float! @validate(type: gt, value: "undefined")
            score: Int! @validate(type: lt, value: "undefined")
            counts: [Float]! @validate(type: gte, value: "undefined")
            numbers: [Int]! @validate(type: lte, value: "undefined")
          }
        `,
        error: "gt value must be a number. Received 'undefined' for field 'rating'",
      },
    ])('$name', ({ schema, error }) => {
      const transformer = new ValidateTransformer();
      expect(() => {
        testTransform({
          schema,
          transformers: [new ModelTransformer(), transformer],
        });
      }).toThrow(error);
    });
  });

  describe('Valid usage', () => {
    test.each([
      {
        name: 'accepts -Infinity value',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float! @validate(type: gt, value: "-Infinity")
            score: Int! @validate(type: lt, value: "-Infinity")
            counts: [Float]! @validate(type: gte, value: "-Infinity")
            numbers: [Int]! @validate(type: lte, value: "-Infinity")
          }
        `,
      },
      {
        name: 'accepts Infinity value',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float! @validate(type: lt, value: "Infinity")
            score: Int! @validate(type: gt, value: "Infinity")
            counts: [Float]! @validate(type: lte, value: "Infinity")
            numbers: [Int]! @validate(type: gte, value: "Infinity")
          }
        `,
      },
      {
        name: 'accepts extremely large value beyond 64-bit range',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float! @validate(type: lte, value: "999999999999999999999999999999")
            score: Int! @validate(type: gte, value: "999999999999999999999999999999")
            counts: [Float]! @validate(type: lte, value: "999999999999999999999999999999")
            numbers: [Int]! @validate(type: gte, value: "999999999999999999999999999999")
          }
        `,
      },
    ])('$name', ({ schema }) => {
      const transformer = new ValidateTransformer();
      expect(() => {
        testTransform({
          schema,
          transformers: [new ModelTransformer(), transformer],
        });
      }).not.toThrow();
    });
  });
});
