import { StringValidationType } from '../types';
import { cleanupTemplateFiles, ERROR_MESSAGE_TEMPLATES_DIR, EvaluateTemplateTestCase, runEvaluateTemplateTest } from './test-utils';

type TestCase = EvaluateTemplateTestCase<string, StringValidationType>;

describe('Error Message Parsing', () => {
  beforeAll(() => cleanupTemplateFiles(ERROR_MESSAGE_TEMPLATES_DIR));
  afterAll(() => cleanupTemplateFiles(ERROR_MESSAGE_TEMPLATES_DIR));

  const runValidationTest = async (testCase: TestCase, index: number, message: string): Promise<void> => {
    const messages = {
      minLength: message,
    } as Record<StringValidationType, string>;
    await runEvaluateTemplateTest(testCase, index, messages, ERROR_MESSAGE_TEMPLATES_DIR);
  };

  const createTestCase = (description: string): TestCase => ({
    description,
    input: 'test-value', // String longer than minimum length of 1
    operator: 'minLength',
    threshold: '1',
    shouldPass: true,
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
        await runValidationTest(createTestCase(testCase.description), index, testCase.message);
      });
    });
  });
});
