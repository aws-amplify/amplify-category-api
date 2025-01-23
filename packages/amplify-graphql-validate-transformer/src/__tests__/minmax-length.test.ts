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
            title: String! @validate(type: minLength, value: "3") 
            content: String! @validate(type: maxLength, value: "10")
          }
        `,
      },
      {
        name: 'accepts length validation on List field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            tags: [String]! @validate(type: minLength, value: "20")
            comments: [String]! @validate(type: maxLength, value: "30")
          }
        `,
      },
      {
        name: 'accepts length values of "0"',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: minLength, value: "0") 
            content: String! @validate(type: maxLength, value: "0")
          }
        `,
      },
      {
        name: 'accepts length values of extremely large numbers beyond 64-bit range',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: minLength, value: "999999999999999999999999999999")
            content: String! @validate(type: maxLength, value: "999999999999999999999999999999")
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
    describe('Special values', () => {
      test.each([
        {
          name: 'rejects value of "NaN"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "NaN")
            }
          `,
          error: "minLength value must be a non-negative integer. Received 'NaN' for field 'title'",
        },
        {
          name: 'rejects value of "undefined"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "undefined")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received 'undefined' for field 'title'",
        },
        {
          name: 'rejects value of "null"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "null")
            }
          `,
          error: "minLength value must be a non-negative integer. Received 'null' for field 'title'",
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

    describe('Non-numeric length values', () => {
      test.each([
        {
          name: 'rejects alphabetic value of "abc"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "abc")
            }
          `,
          error: "minLength value must be a non-negative integer. Received 'abc' for field 'title'",
        },
        {
          name: 'rejects special value of "!#>?$O#"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "!#>?$O#")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received '!#>?$O#' for field 'title'",
        },
        {
          name: 'rejects space value of " "',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: " ")
            }
          `,
          error: "minLength value must be a non-negative integer. Received ' ' for field 'title'",
        },
        {
          name: 'rejects empty string value of ""',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received '' for field 'title'",
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
          name: 'rejects negative value of "-999999999999999999999999999999"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "-999999999999999999999999999999")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '-999999999999999999999999999999' for field 'title'",
        },
        {
          name: 'rejects negative value of "-10"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "-10")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received '-10' for field 'title'",
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
