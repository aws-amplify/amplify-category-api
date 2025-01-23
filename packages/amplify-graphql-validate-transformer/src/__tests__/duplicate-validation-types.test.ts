import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('Duplicate Validation Types', () => {
  describe('Invalid usage', () => {
    test.each([
      {
        name: 'rejects duplicate gt validation on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float! @validate(type: gt, value: "0") @validate(type: gt, value: "1")
          }
        `,
        error: "Duplicate @validate directive with type 'gt' on field 'rating'. Each validation type can only be used once per field.",
      },
      {
        name: 'rejects duplicate lt validation on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: Float! @validate(type: lt, value: "0") @validate(type: lt, value: "1")
          }
        `,
        error: "Duplicate @validate directive with type 'lt' on field 'rating'. Each validation type can only be used once per field.",
      },
      {
        name: 'rejects duplicate gte validation on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            score: Int! @validate(type: gte, value: "5") @validate(type: gte, value: "10")
          }
        `,
        error: "Duplicate @validate directive with type 'gte' on field 'score'. Each validation type can only be used once per field.",
      },
      {
        name: 'rejects duplicate lte validation on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            score: Int! @validate(type: lte, value: "100") @validate(type: lte, value: "200")
          }
        `,
        error: "Duplicate @validate directive with type 'lte' on field 'score'. Each validation type can only be used once per field.",
      },
      {
        name: 'rejects duplicate minLength validation on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: minLength, value: "5") @validate(type: minLength, value: "10")
          }
        `,
        error:
          "Duplicate @validate directive with type 'minLength' on field 'title'. Each validation type can only be used once per field.",
      },
      {
        name: 'rejects duplicate maxLength validation on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: maxLength, value: "5") @validate(type: maxLength, value: "10")
          }
        `,
        error:
          "Duplicate @validate directive with type 'maxLength' on field 'title'. Each validation type can only be used once per field.",
      },
      {
        name: 'rejects duplicate startsWith validation on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: startsWith, value: "5") @validate(type: startsWith, value: "10")
          }
        `,
        error:
          "Duplicate @validate directive with type 'startsWith' on field 'title'. Each validation type can only be used once per field.",
      },
      {
        name: 'rejects duplicate endsWith validation on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: endsWith, value: "5") @validate(type: endsWith, value: "10")
          }
        `,
        error: "Duplicate @validate directive with type 'endsWith' on field 'title'. Each validation type can only be used once per field.",
      },
      {
        name: 'rejects duplicate matches validation on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: matches, value: "5") @validate(type: matches, value: "10")
          }
        `,
        error: "Duplicate @validate directive with type 'matches' on field 'title'. Each validation type can only be used once per field.",
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
        name: 'accepts different validation types on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: minLength, value: "5") @validate(type: maxLength, value: "10")
            rating: Float! @validate(type: gt, value: "0") @validate(type: lt, value: "6")
            score: Int! @validate(type: gte, value: "10") @validate(type: lte, value: "20")
            description: String!
              @validate(type: startsWith, value: "prefix")
              @validate(type: endsWith, value: "suffix")
              @validate(type: matches, value: "regex")
          }
        `,
      },
    ])('$name', ({ schema }) => {
      const out = testTransform({
        schema,
        transformers: [new ModelTransformer(), new ValidateTransformer()],
      });
      expect(out).toBeDefined();
      expect(out.schema).toMatchSnapshot();
    });
  });
});
