import { NUMERIC_VALIDATION_TYPES } from '../types';
import {
  NUMERIC_FIELD_TYPES,
  MIN_MAX_LENGTH_VALIDATION_TYPES,
  runTransformTest,
  createValidationTestCases,
  createValidationSchema,
} from './test-utils';

describe('Input parsing for min/maxLength validations', () => {
  describe('Invalid usage', () => {
    const testInvalidValues = (description: string, values: string[]): void => {
      describe(`${description}`, () => {
        const testCases = createValidationTestCases([...MIN_MAX_LENGTH_VALIDATION_TYPES], ['String'], values, { fieldName: 'title' });
        test.each(testCases)('rejects $validationType value of "$value"', (testCase) => {
          const schema = createValidationSchema(testCase);
          const error = `${testCase.validationType} value must be a non-negative integer. Received '${testCase.value}' for field 'title'`;
          runTransformTest(schema, error);
        });
      });
    };

    testInvalidValues('Negative integer values', ['-3', '-10', '-123', '-999999999999999999999999999999']);
    testInvalidValues('Negative decimal values', ['-1.23', '-123.4567890', '-353756.38']);
    testInvalidValues('Special values', ['NaN', 'undefined', 'null']);
    testInvalidValues('Non-numeric length values', ['abc', 'bcdefghijklmnopqrstuvwxyz', '!#>?$O#']);
    testInvalidValues('Whitespace values', ['', ' ', '          ']);
  });

  describe('Valid usage', () => {
    const testValidValues = (description: string, values: string[]): void => {
      describe(`${description}`, () => {
        const testCases = createValidationTestCases([...MIN_MAX_LENGTH_VALIDATION_TYPES], ['String'], values, { fieldName: 'title' });
        test.each(testCases)('accepts $validationType value of "$value"', (testCase) => {
          const schema = createValidationSchema(testCase);
          runTransformTest(schema);
        });
      });
    };

    testValidValues('Positive integer values', ['3', '10', '123', '1234567890']);
    testValidValues('Zero values', ['0', '00', '000', '+0', '-0']);
    testValidValues('Large number', ['999999999999999999999999999999']);
  });
});

describe('Input parsing for numeric validations', () => {
  describe('Invalid usage', () => {
    const testInvalidValues = (description: string, values: string[]): void => {
      describe(`${description}`, () => {
        const testCases = createValidationTestCases([...NUMERIC_VALIDATION_TYPES], [...NUMERIC_FIELD_TYPES], values);
        test.each(testCases)('rejects `$validationType` validation with value "$value" on `$fieldType` field', (testCase) => {
          const schema = createValidationSchema(testCase);
          const error = `${testCase.validationType} value must be a number. Received '${testCase.value}' for field 'field'`;
          runTransformTest(schema, error);
        });
      });
    };

    testInvalidValues('Whitespace values', ['', ' ', '          ']);
    testInvalidValues('Special values', ['NaN', 'null', 'undefined']);
  });

  describe('Valid usage', () => {
    const testValidValues = (description: string, values: string[]): void => {
      describe(`${description}`, () => {
        const testCases = createValidationTestCases([...NUMERIC_VALIDATION_TYPES], [...NUMERIC_FIELD_TYPES], values);
        test.each(testCases)('accepts `$validationType` validation with value "$value" on `$fieldType` field', (testCase) => {
          const schema = createValidationSchema(testCase);
          runTransformTest(schema);
        });
      });
    };

    testValidValues('Zero values', ['0', '00', '000', '+0', '-0']);
    testValidValues('Positive integer values', ['3', '10', '123', '1234567890']);
    testValidValues('Positive decimal values', ['1.325', '20.5', '432.123']);
    testValidValues('Negative integer values', ['-3', '-10', '-123', '-1234567890']);
    testValidValues('Negative decimal values', ['-1.325', '-20.5', '-432.123']);
    testValidValues('Infinity', ['Infinity', '-Infinity']);
    testValidValues('Extremely large number', ['999999999999999999999999999999']);
  });
});
