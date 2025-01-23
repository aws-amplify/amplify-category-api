import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('Duplicate Validation Types', () => {
  describe('Invalid usage', () => {
    describe('Numeric validations', () => {
      const types = ['gt', 'lt', 'gte', 'lte'];
      const fieldTypes = ['Float', 'Int'];

      test.each(
        types.flatMap((type) =>
          fieldTypes.map((fieldType) => ({
            type,
            fieldType,
          })),
        ),
      )('rejects duplicate $type validation', ({ type, fieldType }) => {
        const schema = /* GraphQL */ `
          type Post @model {
            id: ID!
            rating: ${fieldType}! @validate(type: ${type}, value: "0") @validate(type: ${type}, value: "1")
          }
        `;
        const error = `Duplicate @validate directive with type '${type}' on field 'rating'. Each validation type can only be used once per field.`;

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
          type: 'minLength',
          values: ['5', '10'],
        },
        {
          type: 'maxLength',
          values: ['5', '10'],
        },
        {
          type: 'startsWith',
          values: ['prefix1', 'prefix2'],
        },
        {
          type: 'endsWith',
          values: ['suffix1', 'suffix2'],
        },
        {
          type: 'matches',
          values: ['regex1', 'regex2'],
        },
      ])('rejects duplicate $type validation on same field', ({ type, values }) => {
        const schema = /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: ${type}, value: "${values[0]}") @validate(type: ${type}, value: "${values[1]}")
          }
        `;
        const error = `Duplicate @validate directive with type '${type}' on field 'title'. Each validation type can only be used once per field.`;

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
