import { StringValidationType } from '../types';
import { cleanupTemplateFiles, STRING_TEMPLATES_DIR, EvaluateTemplateTestCase, runEvaluateTemplateTest } from './test-utils';

// Regex patterns for validation
const REGEX_PATTERNS = {
  EMAIL: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  PHONE: '^\\+?[1-9]\\d{0,2}-\\d{3}-\\d{3}-\\d{4}$',
  URL: '^https?://[\\w.-]+\\.[a-zA-Z]{2,}$',
  ALPHANUMERIC: '^[a-zA-Z0-9]+$',
} as const;

// Constants for test values
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

// Validation messages
const VALIDATION_MESSAGES = {
  minLength: (threshold: string) => `String must be at least ${threshold} characters long`,
  maxLength: (threshold: string) => `String must not exceed ${threshold} characters`,
  startsWith: (threshold: string) => `String must start with: ${threshold}`,
  endsWith: (threshold: string) => `String must end with: ${threshold}`,
  matches: (threshold: string) => `String must match pattern: ${threshold}`,
} as const;

type TestCase = EvaluateTemplateTestCase<string, StringValidationType>;
type TestCaseGenerator = (operator: StringValidationType, threshold: string) => TestCase[];

describe('String Validation Rules', () => {
  beforeAll(() => cleanupTemplateFiles(STRING_TEMPLATES_DIR));
  afterAll(() => cleanupTemplateFiles(STRING_TEMPLATES_DIR));

  const runValidationTest = async (testCase: TestCase, index: number): Promise<void> => {
    const messages = {
      minLength: VALIDATION_MESSAGES.minLength(testCase.threshold),
      maxLength: VALIDATION_MESSAGES.maxLength(testCase.threshold),
      startsWith: VALIDATION_MESSAGES.startsWith(testCase.threshold),
      endsWith: VALIDATION_MESSAGES.endsWith(testCase.threshold),
      matches: VALIDATION_MESSAGES.matches(testCase.threshold),
    };
    await runEvaluateTemplateTest(testCase, index, messages, STRING_TEMPLATES_DIR);
  };

  const generateMinLengthTests: TestCaseGenerator = (operator, threshold) => {
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

  const generateMaxLengthTests: TestCaseGenerator = (operator, threshold) => {
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

  const generateStartsWithTests: TestCaseGenerator = (operator, threshold) => [
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

  const generateEndsWithTests: TestCaseGenerator = (operator, threshold) => [
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

  const generateMatchesTests: TestCaseGenerator = (operator) => [
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

  // Run tests for each operator
  const operatorConfigs = [
    { name: 'Minimum Length', cases: generateMinLengthTests('minLength', '5') },
    { name: 'Maximum Length', cases: generateMaxLengthTests('maxLength', '5') },
    { name: 'Starts With', cases: generateStartsWithTests('startsWith', 'hello') },
    { name: 'Ends With', cases: generateEndsWithTests('endsWith', 'world') },
    { name: 'Pattern Matching', cases: generateMatchesTests('matches', 'dummy_pattern') },
  ] as const;

  operatorConfigs.forEach(({ name, cases }) => {
    describe(name, () => {
      cases.forEach((testCase, index) => {
        it(testCase.description, async () => {
          await runValidationTest(testCase, index);
        });
      });
    });
  });
});
