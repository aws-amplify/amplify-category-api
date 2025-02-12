import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';
import { DefaultValueTransformer } from '../../../amplify-graphql-default-value-transformer/src';

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
  fieldType: string;
  fieldName?: string;
  validationType: string;
  validationValue: string;
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
      ${testCase.fieldName || 'field'}: ${testCase.fieldType}! @validate(type: ${testCase.validationType}, value: "${
    testCase.validationValue
  }")
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

  return values.flatMap((validationValue) =>
    validationTypes.flatMap((validationType) =>
      types.map((fieldType) => ({
        fieldType,
        ...(options?.fieldName ? { fieldName: options.fieldName } : {}),
        validationType,
        validationValue,
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
  const modelTransformer = new ModelTransformer();
  const validateTransformer = new ValidateTransformer();
  const defaultTransformer = new DefaultValueTransformer();

  const transform = (): void => {
    testTransform({
      schema,
      transformers: [modelTransformer, validateTransformer, defaultTransformer],
    });
  };

  if (expectError) {
    expect(() => transform()).toThrow(expectError);
  } else {
    expect(() => transform()).not.toThrow();
  }
};
