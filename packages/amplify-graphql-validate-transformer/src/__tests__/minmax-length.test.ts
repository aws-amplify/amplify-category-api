import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ValidateTransformer } from '..';

describe('min/maxLength Validators', () => {
  describe('Invalid usage', () => {
    const types = ['minLength', 'maxLength'];

    const testInvalidValues = (description: string, values: string[]): void => {
      describe(`${description}`, () => {
        test.each(
          types.flatMap((type) =>
            values.map((value) => ({
              type,
              value,
            })),
          ),
        )('rejects $type value of "$value"', ({ type, value }) => {
          const schema = /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: ${type}, value: "${value}")
            }
          `;
          const error = `${type} value must be a non-negative integer. Received '${value}' for field 'title'`;

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

    testInvalidValues('Special values', ['NaN', 'undefined', 'null']);
    testInvalidValues('Non-numeric length values', ['abc', '!#>?$O#']);
    testInvalidValues('Negative length values', ['-999999999999999999999999999999', '-10']);
  });

  describe('Valid usage', () => {
    const types = ['minLength', 'maxLength'];

    const testValidValues = (description: string, testCases: Array<{ value: string; fieldType?: string }>): void => {
      test.each(
        testCases.flatMap((testCase) =>
          types.map((type) => ({
            name: `accepts ${description} of '${testCase.value}'`,
            schema: /* GraphQL */ `
              type Post @model {
                id: ID!
                ${
                  testCase.fieldType ? `${type === 'minLength' ? 'tags' : 'comments'}: [${testCase.fieldType}]!` : 'title: String!'
                } @validate(type: ${type}, value: "${testCase.value}")
              }
            `,
          })),
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

    testValidValues('basic values', [{ value: '3' }, { value: '10' }]);
    testValidValues('List field values', [{ value: '20', fieldType: 'String' }]);
    testValidValues('zero values', [{ value: '0' }]);
    testValidValues('large numbers', [{ value: '999999999999999999999999999999' }]);
    testValidValues('space values', [{ value: '     ' }]);
    testValidValues('empty string', [{ value: '' }]);
    testValidValues('whitespace with newlines', [{ value: '   \\n   ' }]);
    testValidValues('whitespace with tabs', [{ value: '   \\t   ' }]);
    testValidValues('escape characters', [{ value: '    \    ' }]);
  });
});
