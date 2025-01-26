import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

export const NUMERIC_FIELD_TYPES = ['Int', 'Float'] as const;
export const STRING_FIELD_TYPES = ['String'] as const;
export const ALL_FIELD_TYPES = [...NUMERIC_FIELD_TYPES, ...STRING_FIELD_TYPES] as const;
export const MIN_MAX_LENGTH_VALIDATION_TYPES = ['minLength', 'maxLength'] as const;

/**
 * Represents a single validation test case
 * @property {string} validationType - The type of validation to test
 * @property {string} fieldType - The type of field to test
 * @property {string} value - The value to test
 * @property {string} fieldName - The name of the field to test (optional)
 */
type ValidationTestCase = {
  validationType: string;
  fieldType: string;
  value: string;
  fieldName?: string;
};

/**
 * Creates a GraphQL schema for validation testing
 * @param testCase The validation test case containing validation type, field type and value
 * @param extraTypes Additional GraphQL type definitions to append to the schema
 */
export const createValidationSchema = (testCase: ValidationTestCase, extraTypes?: string): string => {
  const baseSchema = /* GraphQL */ `
    type Post @model {
      id: ID!
      ${testCase.fieldName || 'field'}: ${testCase.fieldType}! @validate(type: ${testCase.validationType}, value: "${testCase.value}")
    }
  `;
  return extraTypes ? `${baseSchema}\n${extraTypes}` : baseSchema;
};

/**
 * Generates test cases by combining validation types, field types and values
 * @param validationTypes Array of validation types to test
 * @param fieldTypes Array of field types to test
 * @param values Array of values to test
 * @param options Configuration options
 * @param options.fieldName Optional field name to use in test cases
 * @param options.filterTypes Optional array of types to exclude from test cases
 */
export const createValidationTestCases = (
  validationTypes: string[],
  fieldTypes: string[],
  values: string[],
  options?: {
    fieldName?: string;
    filterTypes?: string[];
  },
): ValidationTestCase[] => {
  const filterTypes = options?.filterTypes ?? [];
  const types = filterTypes.length > 0 ? fieldTypes.filter((type) => !filterTypes.includes(type)) : fieldTypes;

  return values.flatMap((value) =>
    validationTypes.flatMap((validationType) =>
      types.map((fieldType) => ({
        validationType,
        fieldType,
        value,
        ...(options?.fieldName ? { fieldName: options.fieldName } : {}),
      })),
    ),
  );
};

/**
 * Runs a transformer test with the given schema
 * @param schema The GraphQL schema to test
 * @param expectError Optional error message to expect (if testing for failure)
 */
export const runTransformTest = (schema: string, expectError?: string): void => {
  const transformer = new ValidateTransformer();
  if (expectError) {
    expect(() => {
      testTransform({
        schema,
        transformers: [new ModelTransformer(), transformer],
      });
    }).toThrow(expectError);
  } else {
    expect(() => {
      testTransform({
        schema,
        transformers: [new ModelTransformer(), transformer],
      });
    }).not.toThrow();
  }
};
