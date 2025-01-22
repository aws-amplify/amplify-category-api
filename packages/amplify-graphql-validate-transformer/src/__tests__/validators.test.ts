import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('Validators', () => {
  /* ================================ */
  /*  Valid validation tests          */
  /* ================================ */
  it('accepts valid validation configurations', () => {
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

  /* ================================ */
  /*  Type compatibility tests        */
  /* ================================ */
  it('rejects numeric validation on non-numeric field', () => {
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

  it('rejects string validation on non-string field', () => {
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

  /* ================================ */
  /*  Duplicate validation tests      */
  /* ================================ */
  it('rejects duplicate validation types on the same field', () => {
    const invalidSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String! @validate(type: minLength, value: "5") @validate(type: minLength, value: "10")
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

  /* ================================ */
  /*  Length validation value tests   */
  /* ================================ */
  it('rejects negative minLength value', () => {
    const invalidSchema = /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String! @validate(type: minLength, value: "-10")
      }
    `;

    const transformer = new ValidateTransformer();
    expect(() => {
      testTransform({
        schema: invalidSchema,
        transformers: [new ModelTransformer(), transformer],
      });
    }).toThrow("minLength value must be a positive integer. Received '-10' for field 'title'");
  });

  it('rejects negative maxLength value', () => {
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

  it('rejects non-numeric length validation value', () => {
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

  it('rejects decimal length validation value', () => {
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
