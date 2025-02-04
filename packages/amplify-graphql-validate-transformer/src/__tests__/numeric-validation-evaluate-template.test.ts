import { NumericValidationType } from '../types';
import { cleanupTemplateFiles, NUMERIC_TEMPLATES_DIR, EvaluateTemplateTestCase, runEvaluateTemplateTest } from './test-utils';

// Constants for test thresholds
const THRESHOLDS = {
  MIN_AGE: '18',
  MAX_AGE: '65',
  LARGE_POSITIVE_VALUE: '1000000',
  ZERO: '0',
} as const;

// Validation messages
const VALIDATION_MESSAGES = {
  gt: (threshold: string) => `Age must be greater than ${threshold}`,
  lt: (threshold: string) => `Age must be less than ${threshold}`,
  gte: (threshold: string) => `Age must be greater than or equal to ${threshold}`,
  lte: (threshold: string) => `Age must be less than or equal to ${threshold}`,
} as const;

type TestCase = EvaluateTemplateTestCase<number, NumericValidationType>;
type TestCaseGenerator = (operator: NumericValidationType, threshold: string) => TestCase[];

describe('Numeric Validation Rules', () => {
  beforeAll(() => cleanupTemplateFiles(NUMERIC_TEMPLATES_DIR));
  afterAll(() => cleanupTemplateFiles(NUMERIC_TEMPLATES_DIR));

  const runValidationTest = async (testCase: TestCase, index: number): Promise<void> => {
    const messages = {
      gt: VALIDATION_MESSAGES.gt(testCase.threshold),
      lt: VALIDATION_MESSAGES.lt(testCase.threshold),
      gte: VALIDATION_MESSAGES.gte(testCase.threshold),
      lte: VALIDATION_MESSAGES.lte(testCase.threshold),
    };
    await runEvaluateTemplateTest(testCase, index, messages, NUMERIC_TEMPLATES_DIR);
  };

  // Test case generators for common patterns
  const generateBoundaryTests: TestCaseGenerator = (operator, threshold) => {
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

  const generateEdgeCaseTests: TestCaseGenerator = (operator, threshold) => {
    const isGreaterType = operator.startsWith('gt');

    return [
      {
        description: 'should pass validation for large positive value',
        input: Number.MAX_SAFE_INTEGER - 1,
        operator,
        threshold: THRESHOLDS.LARGE_POSITIVE_VALUE,
        // For gt/gte: Should pass because MAX_SAFE_INTEGER > LARGE_POSITIVE_VALUE
        // For lt/lte: Should fail because MAX_SAFE_INTEGER > LARGE_POSITIVE_VALUE
        shouldPass: isGreaterType,
      },
      {
        description: `should ${isGreaterType ? 'fail' : 'pass'} validation for large negative value`,
        input: Number.MIN_SAFE_INTEGER + 1,
        operator,
        threshold,
        // For gt/gte: Should fail because MIN_SAFE_INTEGER < threshold (18)
        // For lt/lte: Should pass because MIN_SAFE_INTEGER < threshold (0)
        shouldPass: !isGreaterType,
      },
      {
        description: `should ${isGreaterType ? 'fail' : 'pass'} validation for negative age`,
        input: -1,
        operator,
        threshold,
        // For gt/gte: Should fail because -1 < threshold (18)
        // For lt/lte: Should pass because -1 < threshold (65)
        shouldPass: !isGreaterType,
      },
      {
        description: `should ${isGreaterType ? 'fail' : 'pass'} validation for zero age`,
        input: 0,
        operator,
        threshold,
        // For gt/gte: Should fail because 0 < threshold (18)
        // For lt/lte: Should pass because 0 < threshold (65)
        shouldPass: !isGreaterType,
      },
    ];
  };

  const generateSafeIntegerTests: TestCaseGenerator = (operator) => {
    const isGreaterType = operator.startsWith('gt');
    const tests: TestCase[] = [];

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

  const generateTestCases = (operator: NumericValidationType, threshold: string): TestCase[] => [
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
    describe(name, () => {
      cases.forEach((testCase, index) => {
        it(testCase.description, async () => {
          await runValidationTest(testCase, index);
        });
      });
    });
  });
});
