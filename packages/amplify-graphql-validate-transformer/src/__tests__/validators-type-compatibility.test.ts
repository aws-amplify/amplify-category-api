import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('Type Compatibility', () => {
  describe('Invalid usage', () => {
    describe('Numeric validations', () => {
      test.each([
        {
          name: 'rejects `gt` validation on String field',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: gt, value: "5")
            }
          `,
          error: "Validation type 'gt' can only be used with numeric fields (Int, Float). Field 'title' is of type 'String'",
        },
        {
          name: 'rejects `lt` validation on ID field',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID! @validate(type: lt, value: "5")
            }
          `,
          error: "Validation type 'lt' can only be used with numeric fields (Int, Float). Field 'id' is of type 'ID'",
        },
        {
          name: 'rejects `gte` validation on Boolean field',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              isPublished: Boolean! @validate(type: gte, value: "5")
            }
          `,
          error: "Validation type 'gte' can only be used with numeric fields (Int, Float). Field 'isPublished' is of type 'Boolean'",
        },
        {
          name: 'rejects `lte` validation on Object field',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String!
              author: Author! @validate(type: lte, value: "5")
            }

            type Author @model {
              id: ID!
              name: String!
            }
          `,
          error: "Validation type 'lte' can only be used with numeric fields (Int, Float). Field 'author' is of type 'Author'",
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

    describe('String validations', () => {
      test.each([
        {
          name: 'rejects minLength validation on Int field',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              count: Int! @validate(type: minLength, value: "5")
            }
          `,
          error: "Validation type 'minLength' can only be used with String fields. Field 'count' is of type 'Int'",
        },
        {
          name: 'rejects maxLength validation on Float field',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              rating: Float! @validate(type: maxLength, value: "10")
            }
          `,
          error: "Validation type 'maxLength' can only be used with String fields. Field 'rating' is of type 'Float'",
        },
        {
          name: 'rejects startsWith validation on Boolean field',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              isPublished: Boolean! @validate(type: startsWith, value: "prefix")
            }
          `,
          error: "Validation type 'startsWith' can only be used with String fields. Field 'isPublished' is of type 'Boolean'",
        },
        {
          name: 'rejects endsWith validation on Object field',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              author: Author! @validate(type: endsWith, value: "suffix")
            }

            type Author @model {
              id: ID!
              name: String!
            }
          `,
          error: "Validation type 'endsWith' can only be used with String fields. Field 'author' is of type 'Author'",
        },
        {
          name: 'rejects matches validation on ID field',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID! @validate(type: matches, value: "regex")
            }
          `,
          error: "Validation type 'matches' can only be used with String fields. Field 'id' is of type 'ID'",
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

  describe('Valid usage', () => {
    test.each([
      {
        name: 'accepts numeric validations on Int field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            count: Int!
              @validate(type: gt, value: "0")
              @validate(type: lt, value: "100")
              @validate(type: gte, value: "1")
              @validate(type: lte, value: "99")
          }
        `,
      },
      {
        name: 'accepts numeric validations on list of Int field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            tags: [Int]! 
              @validate(type: gt, value: "0") 
              @validate(type: lt, value: "100")
              @validate(type: gte, value: "1")
              @validate(type: lte, value: "99")
          }
        `,
      },
      {
        name: 'accepts numeric validations on Float field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float!
              @validate(type: gt, value: "0.0")
              @validate(type: lt, value: "5.0")
              @validate(type: gte, value: "0.1")
              @validate(type: lte, value: "4.9")
          }
        `,
      },
      {
        name: 'accepts numeric validations on list of Float field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            tags: [Float]! 
              @validate(type: gt, value: "0.0") 
              @validate(type: lt, value: "5.0")
              @validate(type: gte, value: "0.1")
              @validate(type: lte, value: "4.9")
          }
        `,
      },
      {
        name: 'accepts string validations on String field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String!
              @validate(type: minLength, value: "5")
              @validate(type: maxLength, value: "10")
              @validate(type: startsWith, value: "prefix")
              @validate(type: endsWith, value: "suffix")
              @validate(type: matches, value: "regex")
          }
        `,
      },
      {
        name: 'accepts string validations on list of String field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            tags: [String]! 
              @validate(type: minLength, value: "5") 
              @validate(type: maxLength, value: "10")
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
