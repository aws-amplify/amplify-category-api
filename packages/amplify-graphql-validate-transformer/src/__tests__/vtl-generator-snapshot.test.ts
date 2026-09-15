import { ValidationsByField, ValidationType } from '../types';
import { generateFieldValidationSnippet, generateTypeValidationSnippet } from '../vtl-generator';

/**
 * Tests for field and type-level VTL validation generators.
 *
 * Verifies:
 * - Single field validations
 * - Multiple validations per field and multiple fields per type
 */
describe('vtl-generator', () => {
  describe('Test `generateFieldValidationSnippet`', () => {
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
        const result = generateFieldValidationSnippet(fieldName, [
          {
            validationType: validationType as ValidationType,
            validationValue,
            errorMessage,
          },
        ]);
        expect(result).toMatchSnapshot(`${fieldName} ${validationType} validation`);
      });
    });

    it('throws error for unknown validation types', () => {
      expect(() =>
        generateFieldValidationSnippet('field', [
          {
            validationType: 'unknownValidationType' as ValidationType,
            validationValue: 'validationValue',
            errorMessage: 'error',
          },
        ]),
      ).toThrow('Unsupported validation type: unknownValidationType');
    });
  });

  describe('Test `generateTypeValidationSnippet`', () => {
    const testCases: Array<{ typeName: string; validationsByField: ValidationsByField }> = [
      {
        typeName: 'Product',
        validationsByField: {
          count: [{ validationType: 'gt', validationValue: '18', errorMessage: 'error' }],
          price: [{ validationType: 'lt', validationValue: '1000', errorMessage: 'Price must be less than 1000' }],
          quantity: [{ validationType: 'gte', validationValue: '0', errorMessage: 'Quantity must be non-negative' }],
          rating: [{ validationType: 'lte', validationValue: '5', errorMessage: 'Rating must be at most 5' }],
        },
      },
      {
        typeName: 'Post',
        validationsByField: {
          title: [{ validationType: 'minLength', validationValue: '3', errorMessage: 'Title must be at least 3 characters' }],
          content: [{ validationType: 'maxLength', validationValue: '500', errorMessage: 'Content must not exceed 500 characters' }],
          url: [{ validationType: 'startsWith', validationValue: 'https://', errorMessage: 'URL must start with https://' }],
          filename: [{ validationType: 'endsWith', validationValue: '.pdf', errorMessage: 'File must be a PDF' }],
          email: [{ validationType: 'matches', validationValue: '^[A-Za-z0-9+_.-]+@(.+)$', errorMessage: 'Invalid email format' }],
        },
      },
      {
        typeName: 'User',
        validationsByField: {
          age: [
            { validationType: 'gt', validationValue: '13', errorMessage: 'Must be over 13' },
            { validationType: 'lt', validationValue: '150', errorMessage: 'Must be under 150' },
          ],
          score: [
            { validationType: 'gte', validationValue: '0', errorMessage: 'Cannot be negative' },
            { validationType: 'lte', validationValue: '100', errorMessage: 'Cannot exceed 100' },
          ],
          email: [
            { validationType: 'minLength', validationValue: '10', errorMessage: 'Email too short' },
            { validationType: 'maxLength', validationValue: '50', errorMessage: 'Email too long' },
            { validationType: 'startsWith', validationValue: 'user_', errorMessage: 'Must start with user_' },
            { validationType: 'endsWith', validationValue: '.com', errorMessage: 'Must end with .com' },
            { validationType: 'matches', validationValue: '^user_[a-z]+.com$', errorMessage: 'Invalid format' },
          ],
        },
      },
    ];

    testCases.forEach(({ typeName, validationsByField }) => {
      it(`generates correct VTL for all validations in a type ${typeName}`, () => {
        const result = generateTypeValidationSnippet(typeName, validationsByField);
        expect(result).toMatchSnapshot(`all validations in a type ${typeName}`);
      });
    });
  });
});
