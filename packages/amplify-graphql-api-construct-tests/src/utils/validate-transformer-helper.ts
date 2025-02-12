import { accessSync, constants, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

import { AppSyncClient, EvaluateMappingTemplateCommand } from '@aws-sdk/client-appsync';
import { ValidationType, ValidationsByField } from '@aws-amplify/graphql-validate-transformer/src/types';
import { generateTypeValidationSnippet } from '@aws-amplify/graphql-validate-transformer/src/vtl-generator';

// Directory paths for storing temporary test files (VTL templates and JSON contexts) during validation tests
export const TEMPLATES_DIR = join(__dirname, '..', '__tests__', 'validate-transformer', '__templates__');
export const STRING_TEMPLATES_DIR = join(TEMPLATES_DIR, 'string-validation');
export const NUMERIC_TEMPLATES_DIR = join(TEMPLATES_DIR, 'numeric-validation');
export const ERROR_MESSAGE_TEMPLATES_DIR = join(TEMPLATES_DIR, 'error-message-parsing');
export const STRING_VALIDATION_THRESHOLD_TEMPLATES_DIR = join(TEMPLATES_DIR, 'string-validation-threshold-parsing');
export const COMPLEX_VALIDATION_TEMPLATES_DIR = join(TEMPLATES_DIR, 'complex-validation');

/**
 * String validations types in a string union
 */
/* c8 ignore start */
export type StringValidationType = 'minLength' | 'maxLength' | 'startsWith' | 'endsWith' | 'matches';
/* c8 ignore end */

/**
 * Numeric validations types in a string union
 */
/* c8 ignore start */
export type NumericValidationType = 'gt' | 'lt' | 'gte' | 'lte';
/* c8 ignore end */

/**
 * Generic test case interface for template evaluation tests
 * @property {string} description - Description of the test case
 * @property {T} input - The input value to test
 * @property {O} operator - The operator type for the validation
 * @property {string} threshold - The threshold value to test against
 * @property {boolean} shouldPass - Whether the test should pass validation
 * @property {string} expectedErrorMessage - Optional expected error message for validation failure
 */
export interface EvaluateTemplateTestCase<T, O> {
  description: string;
  input: T;
  operator: O;
  threshold: string;
  shouldPass: boolean;
  expectedErrorMessage?: string;
}

/**
 * Test case for complex field validations
 * @property {string} description - Description of the test case
 * @property {Record<string, any>} input - The input value to test
 * @property {ValidationsByField} validationsByField - The validations to test
 * @property {boolean} shouldPass - Whether the test should pass validation
 */
export interface ComplexValidationTestCase {
  description: string;
  input: Record<string, any>;
  validationsByField?: ValidationsByField;
  shouldPass?: boolean;
}

/**
 * Cleans up template files in the specified directory
 * @param directory The directory to clean up template files from
 */
export const cleanupTemplateFiles = (directory: string): void => {
  try {
    const files = readdirSync(directory);
    files.forEach((file) => {
      if (file.endsWith('.vtl') || file.endsWith('.json')) {
        unlinkSync(join(directory, file));
      }
    });
  } catch (error) {
    // Directory might not exist yet
  }
};

/**
 * Interface for test files
 * @property {string} templateName - The name of the template file
 * @property {string} contextName - The name of the context file
 */
interface TestFiles {
  templateName: string;
  contextName: string;
}

/**
 * Base context object structure shared across all tests
 */
const BASE_CONTEXT = {
  identity: { username: 'testUser' },
  request: { headers: { 'x-forwarded-for': '127.0.0.1' } },
  info: { fieldName: 'createField', parentTypeName: 'Mutation', variables: {} },
};

/**
 * Creates test file names based on test parameters
 * @param testId - The ID of the test
 * @param operator - The operator to use for the test
 * @returns The test file names
 */
const constructTestFileNames = (testId: string, operator?: string): TestFiles => ({
  templateName: operator ? `template_${operator}_${testId}.vtl` : `template_${testId}.vtl`,
  contextName: operator ? `context_${operator}_${testId}.json` : `context_${testId}.json`,
});

/**
 * Writes template and context files for a test
 * @param directory - The directory to write the files to
 * @param files - The test file names
 * @param template - The template content
 * @param context - The context content
 */
const writeTestFiles = (directory: string, files: TestFiles, template: string, context: any): void => {
  if (!ensureDirectoryExists(directory)) {
    throw new Error(`Cannot create or write to directory: ${directory}`);
  }
  writeFileSync(join(directory, files.templateName), template);
  writeFileSync(join(directory, files.contextName), JSON.stringify(context, null, 2));
};

/**
 * Validates test results based on shouldPass flag
 * @param result - The result of the test
 * @param shouldPass - Whether the test should pass
 * @param expectedErrorMessage - Optional expected error message for validation failure
 */
const validateTestResult = (result: any, shouldPass: boolean, expectedErrorMessage?: string): void => {
  if (shouldPass) {
    expect(result.error).toBeUndefined();
  } else {
    expect(result.error).toBeDefined();
    expect(result.error.message).toBeDefined();
    if (expectedErrorMessage) {
      expect(result.error.message).toBe(expectedErrorMessage);
    }
  }
};

/**
 * Creates a context object for testing validation templates
 * @param input The input value to use in the context
 * @returns The context object
 */
export const createContext = (input: string | number | Record<string, any>): any => {
  const inputField = typeof input === 'object' ? input : { field: input };

  return {
    ...BASE_CONTEXT,
    arguments: { input: inputField },
  };
};

/**
 * Sets up a template test by creating the necessary VTL and context files
 * @param input The input value to test
 * @param operator The operator type for the validation
 * @param threshold The threshold value to test against
 * @param testId Unique identifier for the test
 * @param messages Map of operator to validation message
 * @param directory The directory to write template files to
 * @returns Object containing template and context file names
 */
export const setupEvaluateTemplateTest = <T extends string | number, O extends string>(
  input: T,
  operator: O,
  threshold: string,
  testId: string,
  messages: Record<O, string>,
  directory: string,
): TestFiles => {
  const files = constructTestFileNames(testId, operator);

  const validationsByField = {
    field: [
      {
        validationType: operator as ValidationType,
        validationValue: threshold,
        errorMessage: messages[operator],
      },
    ],
  };

  const validationSnippet = generateTypeValidationSnippet('testType', validationsByField);
  const context = createContext(input);

  writeTestFiles(directory, files, validationSnippet, context);

  return files;
};

/**
 * Sets up a complex validation test by creating the necessary VTL and context files
 * @param testCase - The test case to setup
 * @param testId - The ID of the test
 * @param directory - The directory to write the files to
 * @returns The test file names
 */
const setupComplexValidationTest = (testCase: ComplexValidationTestCase, testId: string, directory: string): TestFiles => {
  const files = constructTestFileNames(testId);
  const validationsByField = testCase.validationsByField ?? {};
  const validationSnippet = generateTypeValidationSnippet('TestType', validationsByField);
  const context = createContext(testCase.input);

  writeTestFiles(directory, files, validationSnippet, context);

  return files;
};

/**
 * Evaluates a mapping template with the given context
 * @param templateName The name of the template to evaluate
 * @param contextName The name of the context to use
 * @param directory The directory containing the template files
 * @returns The result of the evaluation
 */
export const evaluateTemplate = async (templateName: string, contextName: string, directory: string): Promise<any> => {
  try {
    const client = new AppSyncClient({ region: process.env.AWS_REGION });
    const template = readFileSync(join(directory, templateName), 'utf8');
    const context = readFileSync(join(directory, contextName), 'utf8');

    const command = new EvaluateMappingTemplateCommand({ template, context });
    return await client.send(command);
  } catch (error) {
    console.error('Error evaluating template:', error);
    throw error;
  }
};

/**
 * Runs a validation test case
 * @param testCase The test case to run
 * @param index Test index for unique file naming
 * @param messages Map of operator to validation message
 * @param directory The directory to use for template files
 */
export const runEvaluateTemplateTest = async <T extends string | number, O extends string>(
  testCase: EvaluateTemplateTestCase<T, O>,
  index: number,
  messages: Record<O, string>,
  directory: string,
): Promise<void> => {
  const { templateName, contextName } = setupEvaluateTemplateTest(
    testCase.input,
    testCase.operator,
    testCase.threshold,
    `${index}`,
    messages,
    directory,
  );

  const result = await evaluateTemplate(templateName, contextName, directory);
  validateTestResult(result, testCase.shouldPass, testCase.expectedErrorMessage);
};

/**
 * Runs a complex validation test with multiple fields and validations
 * @param testCase - The test case to run
 * @param testId - The ID of the test
 * @param directory - The directory to read the files from
 */
export const runComplexValidationTest = async (testCase: ComplexValidationTestCase, testId: string, directory: string): Promise<void> => {
  const { templateName, contextName } = setupComplexValidationTest(testCase, testId, directory);
  const result = await evaluateTemplate(templateName, contextName, directory);
  validateTestResult(result, testCase.shouldPass ?? true);
};

/**
 * Ensures directory exists and checks write permissions
 * @param directory The directory to check/create
 * @returns true if directory exists and is writable, false otherwise
 */
const ensureDirectoryExists = (directory: string): boolean => {
  try {
    // Create directory if it doesn't exist
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    // Check write permissions
    accessSync(directory, constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
};
