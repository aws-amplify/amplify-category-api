import { exec } from 'child_process';
import { unlinkSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DefaultValueTransformer } from '@aws-amplify/graphql-default-value-transformer';

import { ValidateTransformer } from '..';
import { makeValidationSnippet } from '../vtl-generator';

export const NUMERIC_FIELD_TYPES = ['Int', 'Float'] as const;
export const STRING_FIELD_TYPES = ['String'] as const;
export const ALL_FIELD_TYPES = [...NUMERIC_FIELD_TYPES, ...STRING_FIELD_TYPES] as const;
export const MIN_MAX_LENGTH_VALIDATION_TYPES = ['minLength', 'maxLength'] as const;

export const TEMPLATES_DIR = join(__dirname, '__templates__');
export const STRING_TEMPLATES_DIR = join(TEMPLATES_DIR, 'string-validation-evaluate-template');
export const NUMERIC_TEMPLATES_DIR = join(TEMPLATES_DIR, 'numeric-validation-evaluate-template');
export const ERROR_MESSAGE_TEMPLATES_DIR = join(TEMPLATES_DIR, 'error-message-parsing');

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
 * Generic test case interface for template evaluation tests
 * @property {string} description - Description of the test case
 * @property {T} input - The input value to test
 * @property {O} operator - The operator type for the validation
 * @property {string} threshold - The threshold value to test against
 * @property {boolean} shouldPass - Whether the test should pass validation
 */
export interface EvaluateTemplateTestCase<T, O> {
  description: string;
  input: T;
  operator: O;
  threshold: string;
  shouldPass: boolean;
}

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
 * Promisified version of the exec function
 */
const execAsync = promisify(exec);

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

  console.log(`Setting up test in directory: ${directory}`);

  // Check if directory exists and log the result
  if (!existsSync(directory)) {
    console.log(`Directory does not exist, attempting to create it: ${directory}`);
    try {
      mkdirSync(directory, { recursive: true });
      console.log(`Successfully created directory: ${directory}`);
    } catch (err) {
      console.error(`Error creating directory: ${directory}`, err);
      throw new Error(`Unable to create directory: ${directory}`);
    }
  } else {
    console.log(`Directory exists: ${directory}`);
  }

  // Write template.vtl
  const validationSnippet = makeValidationSnippet('field', operator, threshold, messages[operator]);
  try {
    writeFileSync(join(directory, templateName), validationSnippet);
    console.log(`Successfully wrote template: ${templateName}`);
  } catch (err) {
    console.error(`Error writing template file: ${templateName}`, err);
    throw new Error(`Unable to write template: ${templateName}`);
  }

  // Write context.json
  const context = createContext(input);
  try {
    writeFileSync(join(directory, contextName), JSON.stringify(context, null, 2));
    console.log(`Successfully wrote context: ${contextName}`);
  } catch (err) {
    console.error(`Error writing context file: ${contextName}`, err);
    throw new Error(`Unable to write context: ${contextName}`);
  }

  return { templateName, contextName };
};
// export const setupEvaluateTemplateTest = <T extends string | number, O extends string>(
//   input: T,
//   operator: O,
//   threshold: string,
//   testId: string,
//   messages: Record<O, string>,
//   directory: string,
// ): { templateName: string; contextName: string } => {
//   const templateName = `template_${operator}_${testId}.vtl`;
//   const contextName = `context_${operator}_${testId}.json`;

//   // Write template.vtl
//   const validationSnippet = makeValidationSnippet('field', operator, threshold, messages[operator]);
//   writeFileSync(join(directory, templateName), validationSnippet);

//   // Write context.json
//   const context = createContext(input);
//   writeFileSync(join(directory, contextName), JSON.stringify(context, null, 2));

//   return { templateName, contextName };
// };

/**
 * Evaluates a mapping template with the given context
 * @param templateName The name of the template to evaluate
 * @param contextName The name of the context to use
 * @param directory The directory containing the template files
 * @returns The result of the evaluation
 */
export const evaluateTemplate = async (templateName: string, contextName: string, directory: string): Promise<any> => {
  const { stdout, stderr } = await execAsync(
    `aws appsync evaluate-mapping-template --template file://${templateName} --context file://${contextName}`,
    { cwd: directory },
  );

  if (stderr) {
    console.error('Error output:', stderr);
  }

  return JSON.parse(stdout);
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
  }
};
