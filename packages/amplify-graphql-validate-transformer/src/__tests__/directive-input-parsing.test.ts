import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';
import { NUMERIC_VALIDATION_TYPES } from '../types';

const MIN_MAX_LENGTH_VALIDATION_TYPES = ['minLength', 'maxLength'] as const;
const NUMERIC_FIELD_TYPES = ['Int', 'Float'] as const;

describe('Input parsing for min/maxLength validations', () => {
  type TestCase = {
    type: string;
    value: string;
    schema: string;
    name?: string;
  };

  const createTestCases = (values: string[], type: string): TestCase[] =>
    values.map((value) => ({
      type,
      value,
      schema: /* GraphQL */ `
        type Post @model {
          id: ID!
          title: String! @validate(type: ${type}, value: "${value}")
        }
      `,
    }));

  const runTest = (testCase: TestCase, expectError?: string): void => {
    const transformer = new ValidateTransformer();
    if (expectError) {
      expect(() => {
        testTransform({
          schema: testCase.schema,
          transformers: [new ModelTransformer(), transformer],
        });
      }).toThrow(expectError);
    } else {
      expect(() => {
        testTransform({
          schema: testCase.schema,
          transformers: [new ModelTransformer(), transformer],
        });
      }).not.toThrow();
    }
  };

  describe('Invalid usage', () => {
    const testInvalidValues = (description: string, values: string[]): void => {
      describe(`${description}`, () => {
        test.each(MIN_MAX_LENGTH_VALIDATION_TYPES.flatMap((type) => createTestCases(values, type)))(
          'rejects $type value of "$value"',
          (testCase) => {
            const error = `${testCase.type} value must be a non-negative integer. Received '${testCase.value}' for field 'title'`;
            runTest(testCase, error);
          },
        );
      });
    };

    testInvalidValues('Negative length values', ['-3', '-10', '-123', '-999999999999999999999999999999']);
    testInvalidValues('Negative decimal values', ['-1.23', '-123.4567890', '-353756.38']);
    testInvalidValues('Special values', ['NaN', 'undefined', 'null']);
    testInvalidValues('Non-numeric length values', ['abc', 'bcdefghijklmnopqrstuvwxyz', '!#>?$O#']);
    testInvalidValues('Whitespace values', ['', ' ', '          ']);
  });

  describe('Valid usage', () => {
    const testValidValues = (description: string, values: string[]): void => {
      describe(`${description}`, () => {
        test.each(MIN_MAX_LENGTH_VALIDATION_TYPES.flatMap((type) => createTestCases(values, type)))(
          'accepts $type value of "$value"',
          (testCase) => {
            runTest(testCase);
          },
        );
      });
    };

    testValidValues('Basic values', ['3', '10', '123', '1234567890']);
    testValidValues('Zero values', ['0', '00', '000', '+0', '-0']);
    testValidValues('Large number', ['999999999999999999999999999999']);
  });
});

describe('Input parsing for numeric validations', () => {
  describe('Invalid usage', () => {
    const testInvalidValues = (description: string, values: string[]): void => {
      describe(`${description}`, () => {
        test.each(
          values.flatMap((value) =>
            NUMERIC_VALIDATION_TYPES.flatMap((validationType) =>
              NUMERIC_FIELD_TYPES.map((fieldType) => ({
                validationType,
                fieldType,
                value,
              })),
            ),
          ),
        )('rejects `$validationType` validation with value "$value" on `$fieldType` field', ({ validationType, fieldType, value }) => {
          const schema = /* GraphQL */ `
            type Post @model {
              id: ID!
              field: ${fieldType}! @validate(type: ${validationType}, value: "${value}")
            }
          `;
          const error = `${validationType} value must be a number. Received '${value}' for field 'field'`;

          const transformer = new ValidateTransformer();
          expect(() => {
            testTransform({
              schema,
              transformers: [new ModelTransformer(), transformer],
            });
          }).toThrow(error);
        });
      });
    };

    testInvalidValues('Whitespace values', ['', ' ', '          ']);
    testInvalidValues('Special values', ['NaN', 'null', 'undefined']);
  });

  describe('Valid usage', () => {
    const testValidValues = (description: string, values: string[]): void => {
      describe(`${description}`, () => {
        test.each(
          values.flatMap((value) =>
            NUMERIC_VALIDATION_TYPES.flatMap((validationType) =>
              NUMERIC_FIELD_TYPES.map((fieldType) => ({
                validationType,
                fieldType,
                value,
              })),
            ),
          ),
        )('accepts `$validationType` validation with value "$value" on `$fieldType` field', ({ validationType, fieldType, value }) => {
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
        });
      });
    };

    testValidValues('Zero values', ['0', '00', '000', '+0', '-0']);
    testValidValues('Positive integers', ['3', '10', '123', '1234567890']);
    testValidValues('Positive floats', ['1.325', '20.5', '432.123']);
    testValidValues('Negative integers', ['-3', '-10', '-123', '-1234567890']);
    testValidValues('Negative floats', ['-1.325', '-20.5', '-432.123']);
    testValidValues('Infinity', ['Infinity', '-Infinity']);
    testValidValues('Extremely large number', ['999999999999999999999999999999']);
  });
});
