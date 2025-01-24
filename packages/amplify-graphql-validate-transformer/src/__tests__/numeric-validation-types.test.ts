import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('Numeric Validation Types', () => {
  const numericValidationTypes = ['gt', 'lt', 'gte', 'lte'];
  const fieldTypes = ['Int', 'Float'];

  describe('Invalid usage', () => {
    const testInvalidValues = (description: string, testCases: Array<{ value: string; description: string }>): void => {
      describe(`${description}`, () => {
        test.each(
          testCases.flatMap((testCase) =>
            numericValidationTypes.flatMap((validationType) =>
              fieldTypes.map((fieldType) => ({
                validationType,
                fieldType,
                value: testCase.value,
                description: testCase.description,
              })),
            ),
          ),
        )('rejects `$validationType` validation with $description on `$fieldType` field', ({ validationType, fieldType, value }) => {
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

    testInvalidValues('Empty and special values', [
      { value: '', description: 'empty string' },
      { value: ' ', description: 'string with single space' },
      { value: 'NaN', description: 'Not a Number (NaN)' },
      { value: 'null', description: 'null string' },
      { value: 'undefined', description: 'undefined string' },
    ]);
  });

  describe('Valid usage', () => {
    const testValidValues = (description: string, testCases: Array<{ value: string; isList?: boolean }>): void => {
      test.each(
        testCases.flatMap((testCase) =>
          numericValidationTypes.flatMap((validationType) =>
            fieldTypes.map((fieldType) => ({
              name: `accepts ${validationType} validation with ${description} ${testCase.value} on ${
                testCase.isList ? 'list of ' : ''
              }${fieldType} field`,
              schema: /* GraphQL */ `
                type Post @model {
                  id: ID!
                  field: ${testCase.isList ? `[${fieldType}]` : fieldType}! @validate(type: ${validationType}, value: "${testCase.value}")
                }
              `,
            })),
          ),
        ),
      )('$name', ({ schema }) => {
        const out = testTransform({
          schema,
          transformers: [new ModelTransformer(), new ValidateTransformer()],
        });
        expect(out).toBeDefined();
        expect(out.schema).toMatchSnapshot();
      });
    };

    testValidValues('zero', [{ value: '0' }]);
    testValidValues('positive integer', [{ value: '1' }, { value: '20' }, { value: '432' }]);
    testValidValues('positive float', [{ value: '1.325' }, { value: '20.5' }, { value: '432.123' }]);
    testValidValues('negative integer', [{ value: '-1' }, { value: '-20' }, { value: '-432' }]);
    testValidValues('negative float', [{ value: '-1.325' }, { value: '-20.5' }, { value: '-432.123' }]);
    testValidValues('infinity', [{ value: 'Infinity' }, { value: '-Infinity' }]);
    testValidValues('extremely large number', [{ value: '999999999999999999999999999999' }]);

    testValidValues('zero on list field', [{ value: '0', isList: true }]);
    testValidValues('positive integer on list field', [
      { value: '1', isList: true },
      { value: '20', isList: true },
    ]);
    testValidValues('positive float on list field', [
      { value: '1.325', isList: true },
      { value: '20.5', isList: true },
    ]);
    testValidValues('negative integer on list field', [
      { value: '-1', isList: true },
      { value: '-20', isList: true },
    ]);
    testValidValues('negative float on list field', [
      { value: '-1.325', isList: true },
      { value: '-20.5', isList: true },
    ]);
    testValidValues('infinity on list field', [
      { value: 'Infinity', isList: true },
      { value: '-Infinity', isList: true },
    ]);
    testValidValues('extremely large number on list field', [{ value: '999999999999999999999999999999', isList: true }]);
  });
});
