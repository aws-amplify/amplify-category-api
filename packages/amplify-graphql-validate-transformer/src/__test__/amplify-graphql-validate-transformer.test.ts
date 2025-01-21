import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('ValidateTransformer', () => {
  /* ================================ */
  /*  Valid schema tests              */
  /* ================================ */
  it('allows valid validation directives', () => {
    const validSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String! 
          @validate(type: minLength, value: "3") 
          @validate(type: maxLength, value: "10")
        rating: Float! 
          @validate(type: gt, value: "0") 
          @validate(type: lt, value: "6")
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

  /* ================================ */
  /*  Invalid directive usage tests   */
  /* ================================ */
  it('throws error if duplicate validation type is used on the same field', () => {
    const invalidSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String! 
          @validate(type: minLength, value: "5") 
          @validate(type: minLength, value: "10")
      }
    `;

    const transformer = new ValidateTransformer();
    expect(() => {
      testTransform({
        schema: invalidSchema,
        transformers: [new ModelTransformer(), transformer],
      });
    }).toThrow(
      "Duplicate @validate directive with type 'minLength' on field 'title'. Each validation type can only be used once per field.",
    );
  });

  it('throws error if numeric validation is used on non-numeric field', () => {
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

  it('throws error if string validation is used on non-string field', () => {
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

  // it('throws error if minLength value is not a positive integer', () => {
  //   const invalidSchema = /* GraphQL */ `
  //     type Post @model {
  //       id: ID!
  //       title: String! @validate(type: minLength, value: "0")
  //     }
  //   `;

  //   const transformer = new ValidateTransformer();
  //   expect(() => {
  //     testTransform({
  //       schema: invalidSchema,
  //       transformers: [new ModelTransformer(), transformer],
  //     });
  //   }).toThrow("minLength value must be a positive integer. Received '0' for field 'title'");
  // });

  it('throws error if maxLength value is a negative integer', () => {
    const invalidSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String! @validate(type: maxLength, value: "-5")
      }
    `;

    const transformer = new ValidateTransformer();
    expect(() => {
      testTransform({
        schema: invalidSchema,
        transformers: [new ModelTransformer(), transformer],
      });
    }).toThrow("maxLength value must be a positive integer. Received '-5' for field 'title'");
  });

  it('throws error if length validation value is not a number', () => {
    const invalidSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String! @validate(type: minLength, value: "abc")
      }
    `;

    const transformer = new ValidateTransformer();
    expect(() => {
      testTransform({
        schema: invalidSchema,
        transformers: [new ModelTransformer(), transformer],
      });
    }).toThrow("minLength value must be a positive integer. Received 'abc' for field 'title'");
  });

  it('throws error if length validation value is a decimal', () => {
    const invalidSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String! @validate(type: maxLength, value: "5.5")
      }
    `;

    const transformer = new ValidateTransformer();
    expect(() => {
      testTransform({
        schema: invalidSchema,
        transformers: [new ModelTransformer(), transformer],
      });
    }).toThrow("maxLength value must be a positive integer. Received '5.5' for field 'title'");
  });
});
