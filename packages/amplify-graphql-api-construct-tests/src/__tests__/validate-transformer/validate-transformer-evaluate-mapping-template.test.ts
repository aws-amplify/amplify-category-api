/**
 * Test suites for validating the Validate Transformer's mapping templates.
 *
 * All test suites in this file utilize AppSync's EvaluateMappingTemplateCommand to test
 * mapping templates against expected responses. This allows us to verify that our VTL
 * templates correctly implement the validation logic.
 *
 * Note: During test execution, temporary files will be created in __templates__/ directories:
 * - *.vtl files: VTL templates for each test case
 * - *.json files: Context files containing test inputs
 * These files are automatically cleaned up before and after each test suite runs.
 */
import { ValidationType } from '@aws-amplify/graphql-validate-transformer/src/types';

import { ONE_MINUTE } from '../../utils/duration-constants';
import {
  cleanupTemplateFiles,
  ComplexValidationTestCase,
  COMPLEX_VALIDATION_TEMPLATES_DIR,
  ERROR_MESSAGE_TEMPLATES_DIR,
  EvaluateTemplateTestCase,
  NumericValidationType,
  NUMERIC_TEMPLATES_DIR,
  runComplexValidationTest,
  runEvaluateTemplateTest,
  StringValidationType,
  STRING_TEMPLATES_DIR,
  STRING_VALIDATION_THRESHOLD_TEMPLATES_DIR,
} from '../../utils/validate-transformer-helper';

jest.setTimeout(ONE_MINUTE);

type StringValidationTestCase = EvaluateTemplateTestCase<string, StringValidationType>;
type NumericValidationTestCase = EvaluateTemplateTestCase<number, NumericValidationType>;

/**
 * These tests verify that error messages are correctly handled and escaped when they contain:
 * - Single quotes ('...')
 * - Double quotes ("...")
 * - Backticks (`...`)
 * - Mixed combinations of different quote types
 *
 * This test suite uses the minLength validation type since the main focus is
 * testing proper parsing of quotes in error messages. The quote parsing behavior
 * is the same across all validation types.
 *
 * Each test intentionally fails validation (using a short string against a large minLength)
 * to verify that the error message is returned exactly as specified, with all quotes preserved.
 */
describe('Error Message Parsing', () => {
  beforeAll(() => cleanupTemplateFiles(ERROR_MESSAGE_TEMPLATES_DIR));
  afterAll(() => cleanupTemplateFiles(ERROR_MESSAGE_TEMPLATES_DIR));

  const runValidationTest = async (testCase: StringValidationTestCase, index: number, message: string): Promise<void> => {
    const messages = {
      minLength: message,
    } as Record<StringValidationType, string>;
    await runEvaluateTemplateTest(testCase, index, messages, ERROR_MESSAGE_TEMPLATES_DIR);
  };

  const createTestCase = (description: string, message: string): StringValidationTestCase => ({
    description,
    input: 'a short string',
    operator: 'minLength',
    threshold: '100',
    shouldPass: false,
    expectedErrorMessage: message,
  });

  describe('Messages with different quote types', () => {
    const testCases = [
      {
        description: 'handles single quotes in error message',
        message: "Field 'name' must have 'some' content",
      },
      {
        description: 'handles multiple double quotes in error message',
        message: 'Field "name" must have "some" content',
      },
      {
        description: 'handles multiple backticks in error message',
        message: 'Field `name` must have `some` content',
      },
      {
        description: 'handles mixed quotes in error message',
        message: 'Field "name" must have \'some\' `content` in it',
      },
      {
        description: 'handles complex mixed quotes in error message with all types',
        message: 'Field `\'\'name""` must have \'some "" and ``\' and "other `` and \'\'" content.',
      },
    ] as const;

    testCases.forEach((testCase, index) => {
      it(`${testCase.description}`, async () => {
        await runValidationTest(createTestCase(testCase.description, testCase.message), index, testCase.message);
      });
    });
  });
});

/**
 * Tests string validation threshold parsing with various quote combinations.
 * Verifies that validation thresholds containing quotes are correctly parsed and matched:
 * - Single quotes ('...')
 * - Double quotes ("...")
 * - Backticks (`...`)
 * - Mixed combinations
 * - Nested quotes
 *
 * This test suite uses the startsWith validation type since the main focus is
 * testing proper quote parsing in validation thresholds. The quote parsing behavior
 * is the same across all validation types.
 */
describe('String Validation Threshold Parsing', () => {
  beforeAll(() => cleanupTemplateFiles(STRING_VALIDATION_THRESHOLD_TEMPLATES_DIR));
  afterAll(() => cleanupTemplateFiles(STRING_VALIDATION_THRESHOLD_TEMPLATES_DIR));

  const ERROR_MESSAGES = {
    startsWith: (threshold: string) => `String must start with: ${threshold}`,
  } as const;

  const runValidationTest = async (testCase: StringValidationTestCase, index: number): Promise<void> => {
    const messages = {
      startsWith: ERROR_MESSAGES.startsWith(testCase.threshold),
    } as Record<StringValidationType, string>;
    await runEvaluateTemplateTest(testCase, index, messages, STRING_VALIDATION_THRESHOLD_TEMPLATES_DIR);
  };

  describe('Validation Threshold with different quote types', () => {
    const createTestCase = (description: string, input: string, threshold: string, shouldPass: boolean): StringValidationTestCase => ({
      description,
      input,
      operator: 'startsWith',
      threshold,
      shouldPass,
      expectedErrorMessage: shouldPass ? undefined : ERROR_MESSAGES.startsWith(threshold),
    });

    const testCases = [
      // Single quote tests
      {
        description: 'validates string with single quotes',
        input: "this is a 'prefix' with content",
        threshold: "this is a 'prefix'",
        shouldPass: true,
      },
      {
        description: 'fails when missing single quotes',
        input: 'this is a prefix with content',
        threshold: "this is a 'prefix'",
        shouldPass: false,
      },
      // Double quote tests
      {
        description: 'validates string with double quotes',
        input: 'this is a "prefix" with content',
        threshold: 'this is a "prefix"',
        shouldPass: true,
      },
      {
        description: 'fails when missing double quotes',
        input: 'this is a prefix with content',
        threshold: 'this is a "prefix"',
        shouldPass: false,
      },
      // Backtick tests
      {
        description: 'validates string with backticks',
        input: 'this is a `prefix` with content',
        threshold: 'this is a `prefix`',
        shouldPass: true,
      },
      {
        description: 'fails when missing backticks',
        input: 'this is a prefix with content',
        threshold: 'this is a `prefix`',
        shouldPass: false,
      },
      // Mixed quote tests
      {
        description: 'validates string with quotes at different positions',
        input: 'this `is` a \'prefix\' "with" content',
        threshold: 'this `is` a \'prefix\' "with"',
        shouldPass: true,
      },
      {
        description: 'fails when missing quotes at different positions',
        input: 'this is a prefix with content',
        threshold: 'this `is` a \'prefix\' "with"',
        shouldPass: false,
      },
      {
        description: 'fails when quotes are in wrong positions',
        input: 'this \'is\' a `prefix` "with" content',
        threshold: 'this `is` a \'prefix\' "with"',
        shouldPass: false,
      },
      {
        description: 'fails when some quotes are missing',
        input: 'this `is` a prefix "with" content',
        threshold: 'this `is` a \'prefix\' "with"',
        shouldPass: false,
      },
      // Nested quote tests
      {
        description: 'validates string with nested quotes',
        input: '`"\'"\'nested\'"\'"` with content',
        threshold: '`"\'"\'nested\'"\'"`',
        shouldPass: true,
      },
      {
        description: 'fails when missing nested quotes',
        input: 'nested with content',
        threshold: '`"\'"\'nested\'"\'"`',
        shouldPass: false,
      },
    ];

    testCases.forEach((testCase, index) => {
      it(`${testCase.description}`, async () => {
        await runValidationTest(createTestCase(testCase.description, testCase.input, testCase.threshold, testCase.shouldPass), index);
      });
    });
  });
});

/**
 * Tests for numeric validation operators (gt, gte, lt, lte) with various test scenarios:
 * - Exact threshold values (e.g., age = 18 for minimum age)
 * - Values slightly above/below thresholds
 * - Maximum and minimum safe integers
 * - Large positive/negative values
 * - Zero values
 */
describe('Numeric Validation', () => {
  beforeAll(() => cleanupTemplateFiles(NUMERIC_TEMPLATES_DIR));
  afterAll(() => cleanupTemplateFiles(NUMERIC_TEMPLATES_DIR));

  type NumericValidationTestCaseGenerator = (operator: NumericValidationType, threshold: string) => NumericValidationTestCase[];

  const THRESHOLDS = {
    MIN_AGE: '18',
    MAX_AGE: '65',
    LARGE_POSITIVE_VALUE: '1000000',
    ZERO: '0',
  } as const;

  const ERROR_MESSAGES = {
    gt: (threshold: string) => `Age must be greater than ${threshold}`,
    lt: (threshold: string) => `Age must be less than ${threshold}`,
    gte: (threshold: string) => `Age must be greater than or equal to ${threshold}`,
    lte: (threshold: string) => `Age must be less than or equal to ${threshold}`,
  } as const;

  const runValidationTest = async (testCase: NumericValidationTestCase, index: number): Promise<void> => {
    const messages = {
      gt: ERROR_MESSAGES.gt(testCase.threshold),
      lt: ERROR_MESSAGES.lt(testCase.threshold),
      gte: ERROR_MESSAGES.gte(testCase.threshold),
      lte: ERROR_MESSAGES.lte(testCase.threshold),
    };
    await runEvaluateTemplateTest(testCase, index, messages, NUMERIC_TEMPLATES_DIR);
  };

  const generateBoundaryTests: NumericValidationTestCaseGenerator = (operator, threshold) => {
    const isGreaterType = operator.startsWith('gt');
    const isExactMatch = operator.endsWith('e');
    const exactValue = parseFloat(threshold);
    const slightlyBelow = exactValue - 0.0001;
    const slightlyAbove = exactValue + 0.0001;

    return [
      {
        description: `should ${isExactMatch ? 'pass' : 'fail'} validation when age equals ${isGreaterType ? 'minimum' : 'maximum'}`,
        input: exactValue,
        operator,
        threshold,
        shouldPass: isExactMatch,
      },
      {
        description: `should fail validation when age is just ${isGreaterType ? 'below minimum' : 'above maximum'}`,
        input: isGreaterType ? slightlyBelow : slightlyAbove,
        operator,
        threshold,
        shouldPass: false,
      },
      {
        description: `should pass validation when age is just ${isGreaterType ? 'above minimum' : 'below maximum'}`,
        input: isGreaterType ? slightlyAbove : slightlyBelow,
        operator,
        threshold,
        shouldPass: true,
      },
    ];
  };

  const generateEdgeCaseTests: NumericValidationTestCaseGenerator = (operator, threshold) => {
    const isGreaterType = operator.startsWith('gt');

    return [
      {
        // For gt/gte: Should pass because MAX_SAFE_INTEGER > threshold (1000000)
        // For lt/lte: Should fail because MAX_SAFE_INTEGER > threshold (1000000)
        description: 'should pass validation for large positive value',
        input: Number.MAX_SAFE_INTEGER - 1,
        operator,
        threshold: THRESHOLDS.LARGE_POSITIVE_VALUE,
        shouldPass: isGreaterType,
      },
      {
        // For gt/gte: Should fail because MIN_SAFE_INTEGER + 1 < threshold (18)
        // For lt/lte: Should pass because MIN_SAFE_INTEGER + 1 < threshold (65)
        description: `should ${isGreaterType ? 'fail' : 'pass'} validation for large negative value`,
        input: Number.MIN_SAFE_INTEGER + 1,
        operator,
        threshold,
        shouldPass: !isGreaterType,
      },
      {
        // For gt/gte: Should fail because -1 < threshold (18)
        // For lt/lte: Should pass because -1 < threshold (65)
        description: `should ${isGreaterType ? 'fail' : 'pass'} validation for negative age`,
        input: -1,
        operator,
        threshold,
        shouldPass: !isGreaterType,
      },
      {
        // For gt/gte: Should fail because 0 < threshold (18)
        // For lt/lte: Should pass because 0 < threshold (65)
        description: `should ${isGreaterType ? 'fail' : 'pass'} validation for zero age`,
        input: 0,
        operator,
        threshold,
        shouldPass: !isGreaterType,
      },
    ];
  };

  const generateSafeIntegerTests: NumericValidationTestCaseGenerator = (operator, _) => {
    const isGreaterType = operator.startsWith('gt');
    const tests: NumericValidationTestCase[] = [];

    if (isGreaterType) {
      tests.push({
        description: 'should handle MAX_SAFE_INTEGER correctly',
        input: Number.MAX_SAFE_INTEGER,
        operator,
        threshold: (Number.MAX_SAFE_INTEGER - 1).toString(),
        shouldPass: true,
      });
    } else {
      tests.push({
        description: 'should handle MIN_SAFE_INTEGER correctly',
        input: Number.MIN_SAFE_INTEGER,
        operator,
        threshold: (Number.MIN_SAFE_INTEGER + 1).toString(),
        shouldPass: true,
      });
    }

    return tests;
  };

  const generateTestCases = (operator: NumericValidationType, threshold: string): NumericValidationTestCase[] => [
    ...generateBoundaryTests(operator, threshold),
    ...generateEdgeCaseTests(operator, threshold),
    ...generateSafeIntegerTests(operator, threshold),
  ];

  // Test gt/gte with min age threshold 18
  const gtTestCases = generateTestCases('gt', THRESHOLDS.MIN_AGE);
  const gteTestCases = generateTestCases('gte', THRESHOLDS.MIN_AGE);
  // Test lt/lte with max age threshold 65
  const ltTestCases = generateTestCases('lt', THRESHOLDS.MAX_AGE);
  const lteTestCases = generateTestCases('lte', THRESHOLDS.MAX_AGE);

  const operatorConfigs = [
    { name: 'Greater Than', cases: gtTestCases },
    { name: 'Greater Than or Equal', cases: gteTestCases },
    { name: 'Less Than', cases: ltTestCases },
    { name: 'Less Than or Equal', cases: lteTestCases },
  ] as const;

  operatorConfigs.forEach(({ name, cases }) => {
    describe(`${name}`, () => {
      cases.forEach((testCase, index) => {
        it(`${testCase.description}`, async () => {
          await runValidationTest(testCase, index);
        });
      });
    });
  });
});

/**
 * Tests for string validation operators (minLength, maxLength, startsWith, endsWith, matches) with various test scenarios:
 * - Empty strings
 * - Strings with special characters, numbers, and unicode characters
 * - Strings with spaces, prefixes, and suffixes
 * - Strings with regex patterns
 */
describe('String Validation', () => {
  beforeAll(() => cleanupTemplateFiles(STRING_TEMPLATES_DIR));
  afterAll(() => cleanupTemplateFiles(STRING_TEMPLATES_DIR));

  type StringValidationTestCaseGenerator = (operator: StringValidationType, threshold: string) => StringValidationTestCase[];

  const REGEX_PATTERNS = {
    EMAIL: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    PHONE: '^\\+?[1-9]\\d{0,2}-\\d{3}-\\d{3}-\\d{4}$',
    URL: '^https?://[\\w.-]+\\.[a-zA-Z]{2,}$',
    ALPHANUMERIC: '^[a-zA-Z0-9]+$',
  } as const;

  const TEST_STRINGS = {
    // Length test strings
    EMPTY: '',
    SINGLE_CHAR: 'a',
    THREE_CHARS: 'abc',
    FIVE_CHARS: 'abcde',
    TEN_CHARS: 'abcdefghij',
    TWENTY_CHARS: 'abcdefghijklmnopqrst',

    // Special character test strings
    WITH_SPACES: '  abc  ',
    WITH_SPECIAL_CHARS: 'abc!@#$%^',
    WITH_NUMBERS: 'abc123',
    WITH_UNICODE: 'abc🚀💻',

    // Prefix test strings
    PREFIX_HELLO: 'hello world',
    PREFIX_HELLO_UPPER: 'HELLO world',
    PREFIX_SPACE: ' hello',
    PREFIX_SPECIAL: '@hello',

    // Suffix test strings
    SUFFIX_WORLD: 'hello world',
    SUFFIX_WORLD_UPPER: 'hello WORLD',
    SUFFIX_SPACE: 'world ',
    SUFFIX_SPECIAL: 'world!',

    // Regex test strings
    EMAIL_VALID: 'test@example.com',
    EMAIL_INVALID: 'not-an-email',
    PHONE_VALID: '+1-123-456-7890',
    PHONE_INVALID: '123abc',
    URL_VALID: 'https://aws.amazon.com',
    URL_INVALID: 'not-a-url',
    ALPHANUMERIC: 'abc123',
    NON_ALPHANUMERIC: 'abc!@#',
  } as const;

  const ERROR_MESSAGES = {
    minLength: (threshold: string) => `String must be at least ${threshold} characters long`,
    maxLength: (threshold: string) => `String must not exceed ${threshold} characters`,
    startsWith: (threshold: string) => `String must start with: ${threshold}`,
    endsWith: (threshold: string) => `String must end with: ${threshold}`,
    matches: (threshold: string) => `String must match pattern: ${threshold}`,
  } as const;

  const runValidationTest = async (testCase: StringValidationTestCase, index: number): Promise<void> => {
    const messages = {
      minLength: ERROR_MESSAGES.minLength(testCase.threshold),
      maxLength: ERROR_MESSAGES.maxLength(testCase.threshold),
      startsWith: ERROR_MESSAGES.startsWith(testCase.threshold),
      endsWith: ERROR_MESSAGES.endsWith(testCase.threshold),
      matches: ERROR_MESSAGES.matches(testCase.threshold),
    };
    await runEvaluateTemplateTest(testCase, index, messages, STRING_TEMPLATES_DIR);
  };

  const generateMinLengthTests: StringValidationTestCaseGenerator = (operator, threshold) => {
    return [
      {
        description: 'should fail validation for empty string',
        input: TEST_STRINGS.EMPTY,
        operator,
        threshold,
        shouldPass: false,
      },
      {
        description: 'should fail validation for string shorter than minimum',
        input: TEST_STRINGS.THREE_CHARS,
        operator,
        threshold,
        shouldPass: false,
      },
      {
        description: 'should pass validation for string exactly at minimum length',
        input: TEST_STRINGS.FIVE_CHARS,
        operator,
        threshold,
        shouldPass: true,
      },
      {
        description: 'should pass validation for string longer than minimum',
        input: TEST_STRINGS.TEN_CHARS,
        operator,
        threshold,
        shouldPass: true,
      },
      {
        description: 'should count spaces in length validation',
        input: TEST_STRINGS.WITH_SPACES,
        operator,
        threshold,
        shouldPass: true,
      },
      {
        description: 'should count special characters in length validation',
        input: TEST_STRINGS.WITH_SPECIAL_CHARS,
        operator,
        threshold,
        shouldPass: true,
      },
      {
        description: 'should count numbers in length validation',
        input: TEST_STRINGS.WITH_NUMBERS,
        operator,
        threshold,
        shouldPass: true,
      },
      {
        description: 'should properly count unicode characters',
        input: TEST_STRINGS.WITH_UNICODE,
        operator,
        threshold,
        shouldPass: true,
      },
    ];
  };

  const generateMaxLengthTests: StringValidationTestCaseGenerator = (operator, threshold) => {
    return [
      {
        description: 'should pass validation for empty string',
        input: TEST_STRINGS.EMPTY,
        operator,
        threshold,
        shouldPass: true,
      },
      {
        description: 'should pass validation for string shorter than maximum',
        input: TEST_STRINGS.THREE_CHARS,
        operator,
        threshold,
        shouldPass: true,
      },
      {
        description: 'should pass validation for string exactly at maximum length',
        input: TEST_STRINGS.FIVE_CHARS,
        operator,
        threshold,
        shouldPass: true,
      },
      {
        description: 'should fail validation for string longer than maximum',
        input: TEST_STRINGS.TEN_CHARS,
        operator,
        threshold,
        shouldPass: false,
      },
      {
        description: 'should count spaces in length validation',
        input: TEST_STRINGS.WITH_SPACES,
        operator,
        threshold,
        shouldPass: false,
      },
      {
        description: 'should count special characters in length validation',
        input: TEST_STRINGS.WITH_SPECIAL_CHARS,
        operator,
        threshold,
        shouldPass: false,
      },
      {
        description: 'should count numbers in length validation',
        input: TEST_STRINGS.WITH_NUMBERS,
        operator,
        threshold,
        shouldPass: false,
      },
      {
        description: 'should properly count unicode characters',
        input: TEST_STRINGS.WITH_UNICODE,
        operator,
        threshold,
        shouldPass: false,
      },
    ];
  };

  const generateStartsWithTests: StringValidationTestCaseGenerator = (operator, threshold) => [
    {
      description: 'should pass validation for exact prefix match',
      input: TEST_STRINGS.PREFIX_HELLO,
      operator,
      threshold,
      shouldPass: true,
    },
    {
      description: 'should fail validation for case mismatch',
      input: TEST_STRINGS.PREFIX_HELLO_UPPER,
      operator,
      threshold,
      shouldPass: false,
    },
    {
      description: 'should fail validation for leading space',
      input: TEST_STRINGS.PREFIX_SPACE,
      operator,
      threshold,
      shouldPass: false,
    },
    {
      description: 'should fail validation for non-matching prefix',
      input: TEST_STRINGS.PREFIX_SPECIAL,
      operator,
      threshold,
      shouldPass: false,
    },
    {
      description: 'should pass validation for empty prefix',
      input: TEST_STRINGS.PREFIX_HELLO,
      operator,
      threshold: '',
      shouldPass: true,
    },
  ];

  const generateEndsWithTests: StringValidationTestCaseGenerator = (operator, threshold) => [
    {
      description: 'should pass validation for exact suffix match',
      input: TEST_STRINGS.SUFFIX_WORLD,
      operator,
      threshold: 'world',
      shouldPass: true,
    },
    {
      description: 'should fail validation for case mismatch',
      input: TEST_STRINGS.SUFFIX_WORLD_UPPER,
      operator,
      threshold,
      shouldPass: false,
    },
    {
      description: 'should fail validation for trailing space',
      input: TEST_STRINGS.SUFFIX_SPACE,
      operator,
      threshold,
      shouldPass: false,
    },
    {
      description: 'should fail validation for non-matching suffix',
      input: TEST_STRINGS.SUFFIX_SPECIAL,
      operator,
      threshold,
      shouldPass: false,
    },
    {
      description: 'should pass validation for empty suffix',
      input: TEST_STRINGS.SUFFIX_WORLD,
      operator,
      threshold: '',
      shouldPass: true,
    },
  ];

  const generateMatchesTests: StringValidationTestCaseGenerator = (operator) => [
    // Email pattern tests
    {
      description: 'should pass validation for valid email',
      input: TEST_STRINGS.EMAIL_VALID,
      operator,
      threshold: REGEX_PATTERNS.EMAIL,
      shouldPass: true,
    },
    {
      description: 'should fail validation for invalid email',
      input: TEST_STRINGS.EMAIL_INVALID,
      operator,
      threshold: REGEX_PATTERNS.EMAIL,
      shouldPass: false,
    },
    // Phone number pattern tests
    {
      description: 'should pass validation for valid phone number',
      input: TEST_STRINGS.PHONE_VALID,
      operator,
      threshold: REGEX_PATTERNS.PHONE,
      shouldPass: true,
    },
    {
      description: 'should fail validation for invalid phone number',
      input: TEST_STRINGS.PHONE_INVALID,
      operator,
      threshold: REGEX_PATTERNS.PHONE,
      shouldPass: false,
    },
    // URL pattern tests
    {
      description: 'should pass validation for valid URL',
      input: TEST_STRINGS.URL_VALID,
      operator,
      threshold: REGEX_PATTERNS.URL,
      shouldPass: true,
    },
    {
      description: 'should fail validation for invalid URL',
      input: TEST_STRINGS.URL_INVALID,
      operator,
      threshold: REGEX_PATTERNS.URL,
      shouldPass: false,
    },
    // Alphanumeric pattern tests
    {
      description: 'should pass validation for alphanumeric string',
      input: TEST_STRINGS.ALPHANUMERIC,
      operator,
      threshold: REGEX_PATTERNS.ALPHANUMERIC,
      shouldPass: true,
    },
    {
      description: 'should fail validation for non-alphanumeric string',
      input: TEST_STRINGS.NON_ALPHANUMERIC,
      operator,
      threshold: '^[a-zA-Z0-9]+$',
      shouldPass: false,
    },
  ];

  const minLengthTestCases = generateMinLengthTests('minLength', '5');
  const maxLengthTestCases = generateMaxLengthTests('maxLength', '5');
  const startsWithTestCases = generateStartsWithTests('startsWith', 'hello');
  const endsWithTestCases = generateEndsWithTests('endsWith', 'world');
  const matchesTestCases = generateMatchesTests('matches', 'dummy_pattern');

  const operatorConfigs = [
    { name: 'Minimum Length', cases: minLengthTestCases },
    { name: 'Maximum Length', cases: maxLengthTestCases },
    { name: 'Starts With', cases: startsWithTestCases },
    { name: 'Ends With', cases: endsWithTestCases },
    { name: 'Pattern Matching', cases: matchesTestCases },
  ] as const;

  operatorConfigs.forEach(({ name, cases }) => {
    describe(`${name}`, () => {
      cases.forEach((testCase, index) => {
        it(`${testCase.description}`, async () => {
          await runValidationTest(testCase, index);
        });
      });
    });
  });
});

/**
 * Tests for multiple validations per field and multiple fields per type
 */
describe('Complex Field Validations', () => {
  beforeAll(() => cleanupTemplateFiles(COMPLEX_VALIDATION_TEMPLATES_DIR));
  afterAll(() => cleanupTemplateFiles(COMPLEX_VALIDATION_TEMPLATES_DIR));

  const AGE_VALIDATIONS = [
    { validationType: 'gt' as ValidationType, validationValue: '13', errorMessage: 'Must be over 13' },
    { validationType: 'lt' as ValidationType, validationValue: '150', errorMessage: 'Must be under 150' },
  ];

  const EMAIL_VALIDATIONS = [
    { validationType: 'minLength' as ValidationType, validationValue: '10', errorMessage: 'Email too short' },
    { validationType: 'maxLength' as ValidationType, validationValue: '50', errorMessage: 'Email too long' },
    { validationType: 'startsWith' as ValidationType, validationValue: 'user_', errorMessage: 'Must start with user_' },
    { validationType: 'endsWith' as ValidationType, validationValue: '.com', errorMessage: 'Must end with .com' },
    { validationType: 'matches' as ValidationType, validationValue: '^user_[a-z_]+@[a-z]+\\.com$', errorMessage: 'Invalid email format' },
  ];

  const USERNAME_VALIDATIONS = [
    { validationType: 'minLength' as ValidationType, validationValue: '3', errorMessage: 'Username too short' },
    { validationType: 'maxLength' as ValidationType, validationValue: '20', errorMessage: 'Username too long' },
    {
      validationType: 'matches' as ValidationType,
      validationValue: '^[a-zA-Z][a-zA-Z0-9_]*$',
      errorMessage: 'Username must start with a letter and contain only letters, numbers, and underscores',
    },
  ];

  const PASSWORD_VALIDATIONS = [
    { validationType: 'minLength' as ValidationType, validationValue: '8', errorMessage: 'Password too short' },
    { validationType: 'maxLength' as ValidationType, validationValue: '100', errorMessage: 'Password too long' },
    {
      validationType: 'matches' as ValidationType,
      validationValue: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&#]+$',
      errorMessage: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    },
  ];

  const SCORE_VALIDATIONS = [
    { validationType: 'gte' as ValidationType, validationValue: '0', errorMessage: 'Score cannot be negative' },
    { validationType: 'lte' as ValidationType, validationValue: '100', errorMessage: 'Score cannot exceed 100' },
  ];

  const ALL_FIELD_VALIDATIONS = {
    age: AGE_VALIDATIONS,
    email: EMAIL_VALIDATIONS,
    username: USERNAME_VALIDATIONS,
    password: PASSWORD_VALIDATIONS,
    score: SCORE_VALIDATIONS,
  };

  // Valid test cases - all should pass validation
  const validTestCases: ComplexValidationTestCase[] = [
    {
      description: 'validates all fields with valid values',
      input: {
        age: 25,
        email: 'user_test@example.com',
        username: 'john_doe123',
        password: 'Test123!@#',
        score: 85,
      },
    },
    {
      description: 'validates with missing optional fields (age and email)',
      input: {
        username: 'alice_smith',
        password: 'Secure123!@#',
        score: 90,
      },
    },
    {
      description: 'validates with boundary values (min age, max score)',
      input: {
        age: 14,
        email: 'user_boundary@example.com',
        username: 'boundary_test',
        password: 'Boundary123!@',
        score: 100,
      },
    },
    {
      description: 'validates with username and password only',
      input: {
        username: 'complex_user',
        password: 'P@ssw0rd!#$%',
      },
    },
    {
      description: 'validates with maximum length values',
      input: {
        email: 'user_very_long_email_address@example.com',
        username: 'very_long_username_1',
        password: 'VeryLongP@ssw0rd!WithSpecialChars#$%',
      },
    },
  ];

  // Invalid test cases - all should fail validation
  const invalidTestCases: ComplexValidationTestCase[] = [
    {
      description: 'fails when age is below minimum',
      input: {
        age: 10,
        email: 'user_test@example.com',
        username: 'john_doe123',
        password: 'Test123!@#',
        score: 85,
      },
      shouldPass: false,
    },
    {
      description: 'fails when age is above maximum',
      input: {
        age: 151,
        email: 'user_test@example.com',
        username: 'john_doe123',
        password: 'Test123!@#',
        score: 85,
      },
      shouldPass: false,
    },
    {
      description: 'fails when email format is invalid',
      input: {
        age: 25,
        email: 'invalid@test',
        username: 'valid_user',
        password: 'Test123!@#',
        score: 75,
      },
      shouldPass: false,
    },
    {
      description: 'fails when email does not start with user_',
      input: {
        email: 'invalid_user@example.com',
        username: 'valid_user',
        password: 'Test123!@#',
      },
      shouldPass: false,
    },
    {
      description: 'fails when username starts with number',
      input: {
        username: '1invalid_username',
        password: 'Test123!@#',
        score: 50,
      },
      shouldPass: false,
    },
    {
      description: 'fails when username is too short',
      input: {
        username: 'ab',
        password: 'Test123!@#',
        score: 50,
      },
      shouldPass: false,
    },
    {
      description: 'fails when password lacks uppercase letter',
      input: {
        username: 'valid_user',
        password: 'test123!@#',
        score: 50,
      },
      shouldPass: false,
    },
    {
      description: 'fails when password lacks special character',
      input: {
        username: 'valid_user',
        password: 'Test123456',
        score: 50,
      },
      shouldPass: false,
    },
    {
      description: 'fails when score is negative',
      input: {
        age: 25,
        username: 'valid_user',
        password: 'Test123!@#',
        score: -1,
      },
      shouldPass: false,
    },
    {
      description: 'fails when score exceeds maximum',
      input: {
        age: 25,
        username: 'valid_user',
        password: 'Test123!@#',
        score: 101,
      },
      shouldPass: false,
    },
    {
      description: 'fails with multiple validation errors',
      input: {
        age: 200,
        email: 'not_user@test.org',
        username: 'a',
        password: 'weak',
        score: -10,
      },
      shouldPass: false,
    },
  ];

  describe('Valid Cases', () => {
    validTestCases.forEach((testCase, index) => {
      it(`${testCase.description}`, async () => {
        await runComplexValidationTest(
          {
            ...testCase,
            validationsByField: ALL_FIELD_VALIDATIONS,
          },
          `valid_${index}`,
          COMPLEX_VALIDATION_TEMPLATES_DIR,
        );
      });
    });
  });

  describe('Invalid Cases', () => {
    invalidTestCases.forEach((testCase, index) => {
      it(`${testCase.description}`, async () => {
        await runComplexValidationTest(
          {
            ...testCase,
            validationsByField: ALL_FIELD_VALIDATIONS,
          },
          `invalid_${index}`,
          COMPLEX_VALIDATION_TEMPLATES_DIR,
        );
      });
    });
  });
});
