import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('Type Compatibility', () => {
  describe('Invalid usage', () => {
    const numericValidationTypes = ['gt', 'lt', 'gte', 'lte'];
    const stringValidationTypes = ['minLength', 'maxLength', 'startsWith', 'endsWith', 'matches'];

    type FieldType = {
      type: string;
      fieldName: string;
      value: string;
      isObject?: boolean;
    };

    const fieldTypes: FieldType[] = [
      { type: 'String', fieldName: 'title', value: 'test' },
      { type: 'ID', fieldName: 'id', value: 'test-id' },
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
      )('rejects `$validationType` validation on $fieldType.type field', ({ validationType, fieldType }) => {
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

    describe('Numeric validations', () => {
      testInvalidFieldTypes(
        numericValidationTypes,
        ['Int', 'Float'],
        (validationType, fieldType) =>
          `Validation type '${validationType}' can only be used with numeric fields (Int, Float). Field '${fieldType.fieldName}' is of type '${fieldType.type}'`,
      );
    });

    describe('String validations', () => {
      testInvalidFieldTypes(
        stringValidationTypes,
        ['String'],
        (validationType, fieldType) =>
          `Validation type '${validationType}' can only be used with String fields. Field '${fieldType.fieldName}' is of type '${fieldType.type}'`,
      );
    });
  });

  describe('Valid usage', () => {
    const testValidFieldTypes = (_: string, testCases: Array<{ validationType: string; fieldType: string; value: string }>): void => {
      test.each(testCases)(
        'accepts $validationType validation on $fieldType field with value $value',
        ({ validationType, fieldType, value }) => {
          const schema = /* GraphQL */ `
            type Post @model {
              id: ID!
              field: ${fieldType}! @validate(type: ${validationType}, value: "${value}")
            }
          `;
          const out = testTransform({
            schema,
            transformers: [new ModelTransformer(), new ValidateTransformer()],
          });
          expect(out).toBeDefined();
          expect(out.schema).toMatchSnapshot();
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
