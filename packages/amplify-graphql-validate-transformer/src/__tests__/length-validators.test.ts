import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('minLength/maxLength Validators', () => {
  describe('Valid usage', () => {
    test.each([
      {
        name: 'accepts valid length validation configurations',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: minLength, value: "3") @validate(type: maxLength, value: "10")
            tags: [String]! @validate(type: maxLength, value: "20")
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
            title: String! @validate(type: minLength, value: "34000004135000000") @validate(type: maxLength, value: "43000034000004135000000")
          }
        `,
      },
      {
        name: 'accepts minLength and maxLength of extremely large numbers beyond 64-bit range',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: minLength, value: "9999999999999999999999999999") @validate(type: maxLength, value: "999999999999999999999999999999")
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
          name: 'rejects negative zero minLength value "-0"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "-0")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '-0' for field 'title'",
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
        {
          name: 'rejects negative maxLength value of -4/2',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "-4/2")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received '-4/2' for field 'title'",
        },
        {
          name: 'rejects negative minLength value of "-0.000001"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "-0.000001")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '-0.000001' for field 'title'",
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

    describe('Non-integer length values', () => {
      test.each([
        {
          name: 'rejects decimal maxLength value of "5.5"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "5.5")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received '5.5' for field 'title'",
        },
        {
          name: 'rejects decimal minLength value of "1.000001"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "1.000001")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '1.000001' for field 'title'",
        },
        {
          name: 'rejects decimal minLength value of "0.00000"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "0.00000")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '0.00000' for field 'title'",
        },
        {
          name: 'rejects fractional maxLength value of "4/2"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "4/2")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received '4/2' for field 'title'",
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

    describe('Leading plus sign', () => {
      test.each([
        {
          name: 'rejects leading plus sign minLength value of "+99"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "+99")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '+99' for field 'title'",
        },
        {
          name: 'rejects leading plus sign maxLength value of "+0"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "+0")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received '+0' for field 'title'",
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

    describe('Leading zeros', () => {
      test.each([
        {
          name: 'rejects leading zero minLength value of "01"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "01")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '01' for field 'title'",
        },
        {
          name: 'rejects leading zero maxLength value of "00000001234"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "00000001234")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received '00000001234' for field 'title'",
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

    describe('Scientific notation', () => {
      test.each([
        {
          name: 'rejects scientific notation minLength value of "1e10"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: minLength, value: "1e10")
            }
          `,
          error: "minLength value must be a non-negative integer. Received '1e10' for field 'title'",
        },
        {
          name: 'rejects scientific notation maxLength value of "2E3"',
          schema: /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: maxLength, value: "2E3")
            }
          `,
          error: "maxLength value must be a non-negative integer. Received '2E3' for field 'title'",
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

