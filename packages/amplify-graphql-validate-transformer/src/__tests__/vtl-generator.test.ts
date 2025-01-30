import { makeValidationSnippet } from '../vtl-generator';

describe('vtl-generator', () => {
  describe('Test `makeValidationSnippet` with different validation types', () => {
    const testCases = [
      {
        fieldName: 'age',
        validationType: 'gt',
        validationValue: '18',
        errorMessage: 'Age must be greater than 18',
      },
      {
        fieldName: 'price',
        validationType: 'lt',
        validationValue: '1000',
        errorMessage: 'Price must be less than 1000',
      },
      {
        fieldName: 'quantity',
        validationType: 'gte',
        validationValue: '0',
        errorMessage: 'Quantity must be non-negative',
      },
      {
        fieldName: 'rating',
        validationType: 'lte',
        validationValue: '5',
        errorMessage: 'Rating must be at most 5',
      },
      {
        fieldName: 'name',
        validationType: 'minlength',
        validationValue: '3',
        errorMessage: 'Name must be at least 3 characters',
      },
      {
        fieldName: 'bio',
        validationType: 'maxlength',
        validationValue: '500',
        errorMessage: 'Bio must not exceed 500 characters',
      },
      {
        fieldName: 'url',
        validationType: 'startswith',
        validationValue: 'https://',
        errorMessage: 'URL must start with https://',
      },
      {
        fieldName: 'filename',
        validationType: 'endswith',
        validationValue: '.pdf',
        errorMessage: 'File must be a PDF',
      },
      {
        fieldName: 'email',
        validationType: 'matches',
        validationValue: '^[A-Za-z0-9+_.-]+@(.+)$',
        errorMessage: 'Invalid email format',
      },
    ];

    testCases.forEach(({ fieldName, validationType, validationValue, errorMessage }) => {
      it(`generates correct VTL for ${validationType} validation`, () => {
        const result = makeValidationSnippet(fieldName, validationType, validationValue, errorMessage);
        expect(result).toMatchSnapshot(`${fieldName} ${validationType} validation`);
      });
    });

    it('throws error for unknown validation types', () => {
      expect(() => makeValidationSnippet('field', 'unknown', 'value', 'error')).toThrow('Unsupported validation type: unknown');
    });

    it('includes validation details in block comment', () => {
      const result = makeValidationSnippet('age', 'gt', '18', 'error');
      expect(result).toMatchSnapshot('validation details in block comment');
    });
  });
});
