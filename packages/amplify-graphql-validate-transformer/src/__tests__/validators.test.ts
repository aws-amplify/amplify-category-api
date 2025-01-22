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
});
