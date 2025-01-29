import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ValidateTransformer } from '../graphql-validate-transformer';

type ValidationCheck = {
  field: string;
  message: string;
};

describe('ValidateTransformer', () => {
  const transformSchema = (schema: string): any => {
    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new ValidateTransformer()],
    });
    expect(out).toBeDefined();
    validateModelSchema(parse(out.schema));
    return out;
  };

  const verifyValidations = (out: any, type: string, validations: ValidationCheck[]): void => {
    validations.forEach((validation, index) => {
      const createMutation = out.resolvers[`Mutation.create${type}.validate.${index + 1}.req.vtl`];
      expect(createMutation).toBeDefined();
      expect(createMutation).toContain(validation.message);

      const updateMutation = out.resolvers[`Mutation.update${type}.validate.${index + 1}.req.vtl`];
      expect(updateMutation).toBeDefined();
      expect(updateMutation).toContain(validation.message);
    });
  };

  it('should successfully transform schema with numeric validations', () => {
    const schema = `
      type Product @model {
        id: ID!
        price: Float! @validate(type: gt, value: "0", errorMessage: "Price must be positive")
          @validate(type: lt, value: "1000000", errorMessage: "Price must be less than 1,000,000")
        quantity: Int! @validate(type: gte, value: "0", errorMessage: "Quantity cannot be negative")
          @validate(type: lte, value: "100", errorMessage: "Quantity cannot exceed 100")
      }`;

    const out = transformSchema(schema);

    verifyValidations(out, 'Product', [
      { field: 'price', message: 'Price must be positive' },
      { field: 'price', message: 'Price must be less than 1,000,000' },
      { field: 'quantity', message: 'Quantity cannot be negative' },
      { field: 'quantity', message: 'Quantity cannot exceed 100' },
    ]);
  });

  it('should successfully transform schema with string validations', () => {
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

    verifyValidations(out, 'User', [
      { field: 'email', message: 'Invalid email format' },
      { field: 'username', message: 'Username too short' },
      { field: 'username', message: 'Username too long' },
      { field: 'url', message: 'URL must start with https://' },
      { field: 'url', message: 'URL must end with .com' },
    ]);
  });

  it('should allow multiple validations on the same field', () => {
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

    verifyValidations(out, 'Post', [
      { field: 'title', message: 'Title too short' },
      { field: 'title', message: 'Title too long' },
      { field: 'title', message: 'Title must start with prefix' },
      { field: 'title', message: 'Title must end with suffix' },
      { field: 'title', message: 'Title can only contain letters, numbers and spaces' },
    ]);
  });

  it('should successfully transform schema with validations on multiple fields', () => {
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

    verifyValidations(out, 'Comment', [
      { field: 'content', message: 'Content cannot be empty' },
      { field: 'content', message: 'Content too long' },
      { field: 'author', message: 'Author too short' },
      { field: 'author', message: 'Author too long' },
      { field: 'rating', message: 'Rating cannot be negative' },
      { field: 'rating', message: 'Rating cannot exceed 5' },
    ]);
  });
});
