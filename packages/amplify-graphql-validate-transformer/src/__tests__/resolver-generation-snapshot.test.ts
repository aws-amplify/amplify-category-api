import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ValidateTransformer } from '../graphql-validate-transformer';

/**
 * Tests for the ValidateTransformer's resolver generation functionality.
 *
 * This test suite verifies that the transformer:
 * - Correctly generates combined VTL templates for all validations in a type
 * - Maintains consistent snapshot output for different validation scenarios
 * - Handles all supported validation types (numeric, string) correctly in a single template
 */
describe('Resolver Generation Snapshot', () => {
  const transformSchema = (schema: string): any => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new ValidateTransformer()],
    });
    expect(out).toBeDefined();
    validateModelSchema(parse(out.schema));
    return out;
  };

  const testValidations = (out: any, type: string, operation: 'create' | 'update'): void => {
    expect(out.resolvers[`Mutation.${operation}${type}.validate.1.req.vtl`]).toMatchSnapshot(
      `${operation} ${type.toLowerCase()} combined validations`,
    );
  };

  const testTypeValidationPair = (out: any, type: string): void => {
    testValidations(out, type, 'create');
    testValidations(out, type, 'update');
  };

  it('should generate correct combined validation resolver for numeric validations', () => {
    const schema = `
      type Product @model {
        id: ID!
        price: Float! @validate(type: gt, value: "0", errorMessage: "Price must be positive")
          @validate(type: lt, value: "1000000", errorMessage: "Price must be less than 1,000,000")
        quantity: Int! @validate(type: gte, value: "0", errorMessage: "Quantity cannot be negative")
          @validate(type: lte, value: "100", errorMessage: "Quantity cannot exceed 100")
      }`;

    const out = transformSchema(schema);
    testTypeValidationPair(out, 'Product');
  });

  it('should generate correct combined validation resolver for string validations', () => {
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
    testTypeValidationPair(out, 'User');
  });

  it('should generate correct combined validation resolver for multiple validations on the same field', () => {
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
    testTypeValidationPair(out, 'Post');
  });

  it('should generate correct combined validation resolver for multiple fields', () => {
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
    testTypeValidationPair(out, 'Comment');
  });
});
