import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('min/maxLength Validators', () => {
  describe('Valid usage', () => {
    test.each([
      {
        name: 'accepts valid length validation configurations',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: minLength, value: "3") @validate(type: maxLength, value: "10")
          }
        `,
      },
      {
        name: 'accepts length validation on List field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            tags: [String]! @validate(type: maxLength, value: "20")
            comments: [String]! @validate(type: minLength, value: "20")
          }
        `,
      },
      {
        name: 'accepts minLength and maxLength of "0"',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: minLength, value: "0") @validate(type: maxLength, value: "0")
          }
        `,
      },
      {
        name: 'accepts minLength and maxLength of large numbers with lots of zeros in the middle',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String!
              @validate(type: minLength, value: "34000004135000000")
              @validate(type: maxLength, value: "43000034000004135000000")
          }
        `,
      },
      {
        name: 'accepts minLength and maxLength of extremely large numbers beyond 64-bit range',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String!
              @validate(type: minLength, value: "9999999999999999999999999999")
              @validate(type: maxLength, value: "999999999999999999999999999999")
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

  describe('Invalid usage', () => {
    describe('Non-numeric length values', () => {
      test.each([
        {
          name: 'rejects alphabetic minLength value of "abc"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "abc")
            }
          `,
          error: "minLength value must be a non-negative integer. Received 'abc' for field 'title'",
        },
        {
          name: 'rejects special character maxLength value of "!#>?$O#"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "!#>?$O#")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received '!#>?$O#' for field 'title'",
        },
        {
          name: 'rejects space minLength value of " "',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: " ")
            }
          `,
          error: "minLength value must be a non-negative integer. Received ' ' for field 'title'",
        },
        {
          name: 'rejects empty string minLength value of ""',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '' for field 'title'",
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

    describe('Negative length values', () => {
      test.each([
        {
          name: 'rejects negative zero minLength value "-5.6"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "-5.6")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '-5.6' for field 'title'",
        },
        {
          name: 'rejects negative minLength value of -10',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "-10")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '-10' for field 'title'",
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
  });
});
