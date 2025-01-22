import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('Validators', () => {
  describe('Valid configurations', () => {
    test('accepts valid validation configurations', () => {
      const validSchema = /* GraphQL */ `
        type Post @model {
          id: ID!
          title: String! @validate(type: minLength, value: "3") @validate(type: maxLength, value: "10")
          rating: Float! @validate(type: gt, value: "0") @validate(type: lt, value: "6")
          tags: [String]! @validate(type: maxLength, value: "20")
        }
      `;

      const transformer = new ValidateTransformer();
      expect(() => {
        testTransform({
          schema: validSchema,
          transformers: [new ModelTransformer(), transformer],
        });
      }).not.toThrow();
    });
  });

  /* ================================ */
  /*  Type compatibility tests        */
  /* ================================ */
  test('rejects numeric validation on non-numeric field', () => {
    const invalidSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String! @validate(type: gt, value: "5")
      }
    `;

    const transformer = new ValidateTransformer();
    expect(() => {
      testTransform({
        schema: invalidSchema,
        transformers: [new ModelTransformer(), transformer],
      });
    }).toThrow("Validation type 'gt' can only be used with numeric fields (Int, Float). Field 'title' is of type 'String'");
  });

  test('rejects string validation on non-string field', () => {
    const invalidSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        count: Int! @validate(type: minLength, value: "5")
      }
    `;

    const transformer = new ValidateTransformer();
    expect(() => {
      testTransform({
        schema: invalidSchema,
        transformers: [new ModelTransformer(), transformer],
      });
    }).toThrow("Validation type 'minLength' can only be used with String fields. Field 'count' is of type 'Int'");
  });
});
