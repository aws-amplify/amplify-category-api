import { makeValidationSnippet } from '../vtl-generator';

describe('vtl-generator', () => {
  describe('Test `makeValidationSnippet` with different combinations of input', () => {
    const testCases = [
      {
        fieldName: 'age',
        validationType: 'gt',
        validationValue: '18',
        errorMessage: 'Age must be greater than 18',
        expectedContains: [
          '#if( !$util.isNull($ctx.args.input.age) )',
          '#set($validationFailed = $$ctx.args.input.age <= 18)',
          '$util.error("Age must be greater than 18")',
        ],
      },
      {
        fieldName: 'price',
        validationType: 'lt',
        validationValue: '1000',
        errorMessage: 'Price must be less than 1000',
        expectedContains: [
          '#if( !$util.isNull($ctx.args.input.price) )',
          '#set($validationFailed = $$ctx.args.input.price >= 1000)',
          '$util.error("Price must be less than 1000")',
        ],
      },
      {
        fieldName: 'quantity',
        validationType: 'gte',
        validationValue: '0',
        errorMessage: 'Quantity must be non-negative',
        expectedContains: [
          '#if( !$util.isNull($ctx.args.input.quantity) )',
          '#set($validationFailed = $$ctx.args.input.quantity < 0)',
          '$util.error("Quantity must be non-negative")',
        ],
      },
      {
        fieldName: 'rating',
        validationType: 'lte',
        validationValue: '5',
        errorMessage: 'Rating must be at most 5',
        expectedContains: [
          '#if( !$util.isNull($ctx.args.input.rating) )',
          '#set($validationFailed = $$ctx.args.input.rating > 5)',
          '$util.error("Rating must be at most 5")',
        ],
      },
      {
        fieldName: 'name',
        validationType: 'minlength',
        validationValue: '3',
        errorMessage: 'Name must be at least 3 characters',
        expectedContains: [
          '#if( !$util.isNull($ctx.args.input.name) )',
          '#set($validationFailed = $$ctx.args.input.name.length() < 3)',
          '$util.error("Name must be at least 3 characters")',
        ],
      },
      {
        fieldName: 'bio',
        validationType: 'maxlength',
        validationValue: '500',
        errorMessage: 'Bio must not exceed 500 characters',
        expectedContains: [
          '#if( !$util.isNull($ctx.args.input.bio) )',
          '#set($validationFailed = $$ctx.args.input.bio.length() > 500)',
          '$util.error("Bio must not exceed 500 characters")',
        ],
      },
      {
        fieldName: 'url',
        validationType: 'startswith',
        validationValue: 'https://',
        errorMessage: 'URL must start with https://',
        expectedContains: [
          '#if( !$util.isNull($ctx.args.input.url) )',
          '#set($validationFailed = !$$ctx.args.input.url.startsWith("https://"))',
          '$util.error("URL must start with https://")',
        ],
      },
      {
        fieldName: 'filename',
        validationType: 'endswith',
        validationValue: '.pdf',
        errorMessage: 'File must be a PDF',
        expectedContains: [
          '#if( !$util.isNull($ctx.args.input.filename) )',
          '#set($validationFailed = !$$ctx.args.input.filename.endsWith(".pdf"))',
          '$util.error("File must be a PDF")',
        ],
      },
      {
        fieldName: 'email',
        validationType: 'matches',
        validationValue: '^[A-Za-z0-9+_.-]+@(.+)$',
        errorMessage: 'Invalid email format',
        expectedContains: [
          '#if( !$util.isNull($ctx.args.input.email) )',
          '#set($validationFailed = !$util.matches($$ctx.args.input.email, "^[A-Za-z0-9+_.-]+@(.+)$"))',
          '$util.error("Invalid email format")',
        ],
      },
    ];

    testCases.forEach(({ fieldName, validationType, validationValue, errorMessage, expectedContains }) => {
      it(`generates correct VTL for ${validationType} validation`, () => {
        const result = makeValidationSnippet(fieldName, validationType, validationValue, errorMessage);

        expectedContains.forEach((expected) => {
          expect(result).toContain(expected);
        });
      });
    });

    it('throws error for unknown validation types', () => {
      expect(() => makeValidationSnippet('field', 'unknown', 'value', 'error')).toThrow('Unsupported validation type: unknown');
    });

    it('includes the validation details in the block comment', () => {
      const result = makeValidationSnippet('age', 'gt', '18', 'error');
      expect(result).toContain('Validating "age" with gt');
    });
  });
});
