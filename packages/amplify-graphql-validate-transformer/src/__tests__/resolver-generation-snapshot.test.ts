import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ValidateTransformer } from '../graphql-validate-transformer';

/**
 * Tests for the ValidateTransformer's resolver generation functionality.
 *
 * This test suite verifies that the transformer:
 * - Correctly generates VTL templates for validation rules
 * - Maintains consistent snapshot output for different validation scenarios
 * - Handles all supported validation types (numeric, string) correctly
 */
describe('Resolver generation', () => {
  const transformSchema = (schema: string): any => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new ValidateTransformer()],
    });
    expect(out).toBeDefined();
    validateModelSchema(parse(out.schema));
    return out;
  };

  const testValidation = (
    out: any,
    type: string,
    field: string,
    validationType: string,
    index: number,
    operation: 'create' | 'update',
  ): void => {
    expect(out.resolvers[`Mutation.${operation}${type}.validate.${index}.req.vtl`]).toMatchSnapshot(
      `${operation} ${type.toLowerCase()} ${field} ${validationType} validation`,
    );
  };

  const testValidationPair = (out: any, type: string, field: string, validationType: string, index: number): void => {
    testValidation(out, type, field, validationType, index, 'create');
    testValidation(out, type, field, validationType, index, 'update');
  };

  it('should generate correct validation resolvers for numeric validations', () => {
    const schema = `
      type Product @model {
        id: ID!
        price: Float! @validate(type: gt, value: "0", errorMessage: "Price must be positive")
          @validate(type: lt, value: "1000000", errorMessage: "Price must be less than 1,000,000")
        quantity: Int! @validate(type: gte, value: "0", errorMessage: "Quantity cannot be negative")
          @validate(type: lte, value: "100", errorMessage: "Quantity cannot exceed 100")
      }`;

    const out = transformSchema(schema);

    // Test price validations
    testValidationPair(out, 'Product', 'price', 'gt', 1);
    testValidationPair(out, 'Product', 'price', 'lt', 2);

    // Test quantity validations
    testValidationPair(out, 'Product', 'quantity', 'gte', 3);
    testValidationPair(out, 'Product', 'quantity', 'lte', 4);
  });

  it('should generate correct validation resolvers for string validations', () => {
    const schema = `
      type User @model {
        id: ID!
        email: String! @validate(type: matches, value: "^[A-Za-z0-9+_.-]+@(.+)$", errorMessage: "Invalid email format")
        username: String! @validate(type: minLength, value: "3", errorMessage: "Username too short")
          @validate(type: maxLength, value: "20", errorMessage: "Username too long")
        url: String @validate(type: startsWith, value: "https://", errorMessage: "URL must start with https://")
          @validate(type: endsWith, value: ".com", errorMessage: "URL must end with .com")
      }`;

    const out = transformSchema(schema);

    // Test email validation
    testValidationPair(out, 'User', 'email', 'matches', 1);

    // Test username validations
    testValidationPair(out, 'User', 'username', 'minLength', 2);
    testValidationPair(out, 'User', 'username', 'maxLength', 3);

    // Test url validations
    testValidationPair(out, 'User', 'url', 'startsWith', 4);
    testValidationPair(out, 'User', 'url', 'endsWith', 5);
  });

  it('should generate correct validation resolvers for multiple validations on the same field', () => {
    const schema = `
      type Post @model {
        id: ID!
        title: String! @validate(type: minLength, value: "5", errorMessage: "Title too short")
          @validate(type: maxLength, value: "100", errorMessage: "Title too long")
          @validate(type: startsWith, value: "prefix", errorMessage: "Title must start with prefix")
          @validate(type: endsWith, value: "suffix", errorMessage: "Title must end with suffix")
          @validate(type: matches, value: "^[A-Za-z0-9 ]+$", errorMessage: "Title can only contain letters, numbers and spaces")
      }`;

    const out = transformSchema(schema);

    // Test all title validations
    testValidationPair(out, 'Post', 'title', 'minLength', 1);
    testValidationPair(out, 'Post', 'title', 'maxLength', 2);
    testValidationPair(out, 'Post', 'title', 'startsWith', 3);
    testValidationPair(out, 'Post', 'title', 'endsWith', 4);
    testValidationPair(out, 'Post', 'title', 'matches', 5);
  });

  it('should generate correct validation resolvers for multiple fields', () => {
    const schema = `
      type Comment @model {
        id: ID!
        content: String! @validate(type: minLength, value: "1", errorMessage: "Content cannot be empty")
          @validate(type: maxLength, value: "1000", errorMessage: "Content too long")
        author: String! @validate(type: minLength, value: "3", errorMessage: "Author too short")
          @validate(type: maxLength, value: "20", errorMessage: "Author too long")
        rating: Int! @validate(type: gte, value: "0", errorMessage: "Rating cannot be negative")
          @validate(type: lte, value: "5", errorMessage: "Rating cannot exceed 5")
      }`;

    const out = transformSchema(schema);

    // Test content validations
    testValidationPair(out, 'Comment', 'content', 'minLength', 1);
    testValidationPair(out, 'Comment', 'content', 'maxLength', 2);

    // Test author validations
    testValidationPair(out, 'Comment', 'author', 'minLength', 3);
    testValidationPair(out, 'Comment', 'author', 'maxLength', 4);

    // Test rating validations
    testValidationPair(out, 'Comment', 'rating', 'gte', 5);
    testValidationPair(out, 'Comment', 'rating', 'lte', 6);
  });
});
