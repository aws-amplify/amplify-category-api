import { readdirSync, unlinkSync, writeFileSync, accessSync, constants, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { AppSyncClient, EvaluateMappingTemplateCommand } from '@aws-sdk/client-appsync';
import { generateTypeValidationSnippet } from '@aws-amplify/graphql-validate-transformer/src/vtl-generator';
import { ValidationType } from '@aws-amplify/graphql-validate-transformer/src/types';
import { ValidationsByField } from '@aws-amplify/graphql-validate-transformer/src/types';

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
 * Creates a context object for testing validation templates
 * @param input The input value to use in the context
 * @returns The context object
 */
export const createContext = (input: string | number): any => {
  return {
    arguments: {
      input: {
        field: input,
      },
    },
    identity: {
      username: 'testUser',
    },
    request: {
      headers: {
        'x-forwarded-for': '127.0.0.1',
      },
    },
    info: {
      fieldName: 'createField',
      parentTypeName: 'Mutation',
      variables: {},
    },
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
): { templateName: string; contextName: string } => {
  const templateName = `template_${operator}_${testId}.vtl`;
  const contextName = `context_${operator}_${testId}.json`;

  // Ensure directory exists and is writable
  if (!ensureDirectoryExists(directory)) {
    throw new Error(`Cannot create or write to directory: ${directory}`);
  }

  // Write template.vtl
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
  writeFileSync(join(directory, templateName), validationSnippet);

  // Write context.json
  const context = createContext(input);
  writeFileSync(join(directory, contextName), JSON.stringify(context, null, 2));

  return { templateName, contextName };
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
    // Initialize the AppSync client
    const client = new AppSyncClient({ region: process.env.AWS_REGION });

    // Read the template and context files
    const template = readFileSync(join(directory, templateName), 'utf8');
    const context = readFileSync(join(directory, contextName), 'utf8');

    // Create the evaluate template command
    const command = new EvaluateMappingTemplateCommand({
      template,
      context,
    });

    // Execute the command
    const response = await client.send(command);
    return response;
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
  const testId = `${index}`;
  const { templateName, contextName } = setupEvaluateTemplateTest(
    testCase.input,
    testCase.operator,
    testCase.threshold,
    testId,
    messages,
    directory,
  );
  const result = await evaluateTemplate(templateName, contextName, directory);

  if (testCase.shouldPass) {
    expect(result.error).toBeUndefined();
  } else {
    expect(result.error).toBeDefined();
    expect(result.error.message).toBeDefined();
    if (testCase.expectedErrorMessage) {
      expect(result.error.message).toBe(testCase.expectedErrorMessage);
    }
  }
};

/**
 * Runs a complex validation test with multiple fields and validations
 */
export const runComplexValidationTest = async (testCase: ComplexValidationTestCase, testId: string, directory: string): Promise<void> => {
  const templateName = `template_${testId}.vtl`;
  const contextName = `context_${testId}.json`;

  // Use default validations if not provided
  const validationsByField = testCase.validationsByField ?? {};
  const shouldPass = testCase.shouldPass ?? true;

  // Generate validation snippet
  const validationSnippet = generateTypeValidationSnippet('TestType', validationsByField);
  writeFileSync(join(directory, templateName), validationSnippet);

  // Create context with multiple fields
  const context = {
    arguments: { input: testCase.input },
    identity: { username: 'testUser' },
    request: { headers: { 'x-forwarded-for': '127.0.0.1' } },
    info: { fieldName: 'createField', parentTypeName: 'Mutation', variables: {} },
  };
  writeFileSync(join(directory, contextName), JSON.stringify(context, null, 2));

  const result = await evaluateTemplate(templateName, contextName, directory);

  if (shouldPass) {
    expect(result.error).toBeUndefined();
  } else {
    expect(result.error).toBeDefined();
    expect(result.error.message).toBeDefined();
  }
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
