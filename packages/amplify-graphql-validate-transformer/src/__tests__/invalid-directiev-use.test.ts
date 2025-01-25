import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';
import { NUMERIC_VALIDATION_TYPES, STRING_VALIDATION_TYPES, VALIDATION_TYPES } from '../types';

const NUMERIC_FIELD_TYPES = ['Int', 'Float'] as const;
const STRING_FIELD_TYPES = ['String'] as const;
const ALL_FIELD_TYPES = [...NUMERIC_FIELD_TYPES, ...STRING_FIELD_TYPES] as const;

describe('Duplicate Validation Types on the same field', () => {
  describe('Invalid usage', () => {
    describe('Numeric validations', () => {
      test.each(
        NUMERIC_VALIDATION_TYPES.flatMap((type) =>
          NUMERIC_FIELD_TYPES.map((fieldType) => ({
            type,
            fieldType,
          })),
        ),
      )('rejects duplicate `$type` validation on `$fieldType` field', ({ type, fieldType }) => {
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
      const testValues = {
        minLength: ['5', '10'],
        maxLength: ['5', '10'],
        startsWith: ['prefix1', 'prefix2'],
        endsWith: ['suffix1', 'suffix2'],
        matches: ['regex1', 'regex2'],
      };

      test.each(
        STRING_VALIDATION_TYPES.map((type) => ({
          type,
          values: testValues[type],
        })),
      )('rejects duplicate `$type` validation on `String` field', ({ type, values }) => {
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
      expect(() => {
        testTransform({
          schema,
          transformers: [new ModelTransformer(), new ValidateTransformer()],
        });
      }).not.toThrow();
    });
  });
});

describe('Validation Type Compatibility with Field Type', () => {
  describe('Invalid usage', () => {
    type FieldType = {
      type: string;
      fieldName: string;
      value: string;
      isObject?: boolean;
    };

    const fieldTypes: FieldType[] = [
      { type: 'String', fieldName: 'title', value: 'test' },
      { type: 'ID', fieldName: 'anotherId', value: 'test-id' },
      { type: 'Boolean', fieldName: 'isPublished', value: 'true' },
      { type: 'Int', fieldName: 'count', value: '5' },
      { type: 'Float', fieldName: 'rating', value: '5.0' },
      { type: 'Author', fieldName: 'author', value: '5', isObject: true },
    ];

    const createTestSchema = (fieldType: FieldType, validationType: string, validationValue: string): string => {
      const baseSchema = /* GraphQL */ `
        type Post @model {
          id: ID!
          ${fieldType.fieldName}: ${fieldType.type}! @validate(type: ${validationType}, value: "${validationValue}")
        }
      `;

      if (fieldType.isObject) {
        return (
          baseSchema +
          /* GraphQL */ `
            type Author @model {
              id: ID!
              name: String!
            }
          `
        );
      }
      return baseSchema;
    };

    const testInvalidFieldTypes = (
      validationTypes: string[],
      allowedTypes: string[],
      errorMessageFn: (type: string, field: FieldType) => string,
    ): void => {
      test.each(
        validationTypes.flatMap((validationType) =>
          fieldTypes
            .filter((fieldType) => !allowedTypes.includes(fieldType.type))
            .map((fieldType) => ({
              validationType,
              fieldType,
            })),
        ),
      )('rejects `$validationType` validation on `$fieldType.type` field', ({ validationType, fieldType }) => {
        const schema = createTestSchema(fieldType, validationType, fieldType.value);
        const transformer = new ValidateTransformer();
        expect(() => {
          testTransform({
            schema,
            transformers: [new ModelTransformer(), transformer],
          });
        }).toThrow(errorMessageFn(validationType, fieldType));
      });
    };

    describe('Numeric validations incompatible with non-numeric fields', () => {
      testInvalidFieldTypes(
        [...NUMERIC_VALIDATION_TYPES],
        [...NUMERIC_FIELD_TYPES],
        (validationType, fieldType) =>
          `Validation type '${validationType}' can only be used with numeric fields (Int, Float). Field '${fieldType.fieldName}' is of type '${fieldType.type}'`,
      );
    });

    describe('String validations incompatible with non-string fields', () => {
      testInvalidFieldTypes(
        [...STRING_VALIDATION_TYPES],
        [...STRING_FIELD_TYPES],
        (validationType, fieldType) =>
          `Validation type '${validationType}' can only be used with String fields. Field '${fieldType.fieldName}' is of type '${fieldType.type}'`,
      );
    });
  });

  describe('Valid usage', () => {
    const testValidFieldTypes = (_: string, testCases: Array<{ validationType: string; fieldType: string; value: string }>): void => {
      test.each(testCases)(
        'accepts `$validationType` validation on `$fieldType` field with value `$value`',
        ({ validationType, fieldType, value }) => {
          const schema = /* GraphQL */ `
            type Post @model {
              id: ID!
              field: ${fieldType}! @validate(type: ${validationType}, value: "${value}")
            }
          `;
          expect(() => {
            testTransform({
              schema,
              transformers: [new ModelTransformer(), new ValidateTransformer()],
            });
          }).not.toThrow();
        },
      );
    };

    testValidFieldTypes('numeric validations', [
      { validationType: 'gt', fieldType: 'Int', value: '0' },
      { validationType: 'gt', fieldType: 'Float', value: '0.1' },
      { validationType: 'lt', fieldType: 'Int', value: '100' },
      { validationType: 'lt', fieldType: 'Float', value: '4.9' },
      { validationType: 'gte', fieldType: 'Int', value: '30' },
      { validationType: 'gte', fieldType: 'Float', value: '30.1' },
      { validationType: 'lte', fieldType: 'Int', value: '40' },
      { validationType: 'lte', fieldType: 'Float', value: '40.9' },
    ]);

    testValidFieldTypes('string validations', [
      { validationType: 'minLength', fieldType: 'String', value: '5' },
      { validationType: 'maxLength', fieldType: 'String', value: '10' },
      { validationType: 'startsWith', fieldType: 'String', value: 'prefix' },
      { validationType: 'endsWith', fieldType: 'String', value: 'suffix' },
      { validationType: 'matches', fieldType: 'String', value: 'regex' },
    ]);
  });
});

describe('Disallow validation on list fields', () => {
  test.each(
    VALIDATION_TYPES.flatMap((validationType) =>
      ALL_FIELD_TYPES.map((fieldType) => ({
        validationType,
        fieldType,
        value: fieldType === 'String' ? 'test' : '0',
      })),
    ),
  )('rejects `$validationType` validation on list of `$fieldType` field', ({ validationType, fieldType, value }) => {
    const schema = /* GraphQL */ `
      type Post @model {
        id: ID!
        field: [${fieldType}]! @validate(type: ${validationType}, value: "${value}")
      }
    `;
    expect(() => {
      testTransform({
        schema,
        transformers: [new ModelTransformer(), new ValidateTransformer()],
      });
    }).toThrow("Validation directive cannot be used on list field 'field'");
  });
});
