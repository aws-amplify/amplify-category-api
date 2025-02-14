import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../../commands';
import { DURATION_30_MINUTES } from '../../utils/duration-constants';
import { E2ETestCase, createE2ETestCases, runE2eTest } from '../../utils/validate-transformer-helper';

jest.setTimeout(DURATION_30_MINUTES);

/**
 * End-to-end tests for the Validate Transformer functionality.
 *
 * This test suite deploys a CDK app containing two types (User and Product) and runs
 * a comprehensive set of validation tests against their CREATE and UPDATE operations.
 *
 * Test Structure:
 * 
 *   User Type Tests
 *   ├── Valid Cases
 *   │   ├── CREATE Operations
 *   │   └── UPDATE Operations
 *   └── Invalid Cases
 *       ├── CREATE Operations
 *       └── UPDATE Operations
 *
 *   Product Type Tests
 *   ├── Valid Cases
 *   │   ├── CREATE Operations
 *   │   └── UPDATE Operations
 *   └── Invalid Cases
 *       ├── CREATE Operations
 *       └── UPDATE Operations
 *
 * Note: For both User and Product types, the last test case in the valid CREATE operations
 * creates an item with id 'test-id'. This item is essential for all subsequent UPDATE
 * test cases as they depend on its existence.
 */
describe('Validate Transformer E2E', () => {
  let projRoot: string;
  let apiEndpoint: string;
  let apiKey: string;

  beforeAll(async () => {
    projRoot = await createNewProjectDir('validate-transformer-e2e');
    const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'validate-transformer'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');

    apiEndpoint = outputs[name].awsAppsyncApiEndpoint;
    apiKey = outputs[name].awsAppsyncApiKey;
  });

  afterAll(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }
    deleteProjectDir(projRoot);
  });

  // User test cases
  const userTypeValidCreateTestCases: E2ETestCase[] = [
    {
      description: 'should create user with valid score',
      input: { score: 75 },
    },
    {
      description: 'should create user with valid age',
      input: { age: 30 },
    },
    {
      description: 'should create user with valid username',
      input: { username: 'validUser' },
    },
    {
      description: 'should create user with valid email',
      input: { email: 'user_test@example.com' },
    },
    {
      description: 'should create user with valid filename',
      input: { filename: 'document.txt' },
    },
    {
      description: 'should create user with valid prefix',
      input: { prefix: 'user_test' },
    },
    {
      // This test case creates a user with id 'test-id' for testing update operation below
      description: 'should create user with all valid fields',
      input: {
        id: 'test-id',
        score: 85,
        age: 25,
        username: 'testUser',
        email: 'user_test@example.com',
        filename: 'report.txt',
        prefix: 'user_john',
      },
    },
  ];

  const userTypeValidUpdateTestCases: E2ETestCase[] = [
    {
      description: 'should update user with valid score',
      input: { id: 'test-id', score: 80 },
    },
    {
      description: 'should update user with valid age',
      input: { id: 'test-id', age: 35 },
    },
    {
      description: 'should update user with valid username',
      input: { id: 'test-id', username: 'newUser' },
    },
    {
      description: 'should update user with valid email',
      input: { id: 'test-id', email: 'user_new@example.com' },
    },
    {
      description: 'should update user with valid filename',
      input: { id: 'test-id', filename: 'updated.txt' },
    },
    {
      description: 'should update user with valid prefix',
      input: { id: 'test-id', prefix: 'user_new' },
    },
    {
      description: 'should update user with all valid fields',
      input: {
        id: 'test-id',
        score: 90,
        age: 30,
        username: 'updatedUsr',
        email: 'user_updated@example.com',
        filename: 'updated.txt',
        prefix: 'user_updated',
      },
    },
  ];

  const userTypeInvalidCreateTestCases: E2ETestCase[] = [
    {
      description: 'should fail with score above maximum',
      input: { score: 150 },
    },
    {
      description: 'should fail with score below minimum',
      input: { score: 0 },
    },
    {
      description: 'should fail with age below minimum',
      input: { age: 17 },
    },
    {
      description: 'should fail with age above maximum',
      input: { age: 66 },
    },
    {
      description: 'should fail with username too short',
      input: { username: 'ab' },
    },
    {
      description: 'should fail with username too long',
      input: { username: 'thisusernameiswaytoolong' },
    },
    {
      description: 'should fail with invalid email format',
      input: { email: 'invalid-email' },
    },
    {
      description: 'should fail with filename not ending in .txt',
      input: { filename: 'document.pdf' },
    },
    {
      description: 'should fail with prefix not starting with user_',
      input: { prefix: 'test_user' },
    },
    {
      description: 'should fail at the first invalid field when there are multiple invalid fields',
      input: {
        score: 150,
        age: 15,
        username: 'a',
        email: 'invalid',
        filename: 'doc.pdf',
        prefix: 'invalid',
      },
    },
  ];

  const userTypeInvalidUpdateTestCases: E2ETestCase[] = [
    {
      description: 'should fail to update user with score above maximum',
      input: { id: 'test-id', score: 150 },
    },
    {
      description: 'should fail to update user with age below minimum',
      input: { id: 'test-id', age: 15 },
    },
    {
      description: 'should fail to update user with username too short',
      input: { id: 'test-id', username: 'ab' },
    },
    {
      description: 'should fail to update user with invalid email format',
      input: { id: 'test-id', email: 'invalid-email' },
    },
    {
      description: 'should fail to update user with filename not ending in .txt',
      input: { id: 'test-id', filename: 'doc.pdf' },
    },
    {
      description: 'should fail to update user with prefix not starting with user_',
      input: { id: 'test-id', prefix: 'invalid_prefix' },
    },
    {
      description: 'should fail to update user with multiple invalid fields',
      input: {
        id: 'test-id',
        score: 150,
        age: 15,
        username: 'a',
        email: 'invalid',
        filename: 'doc.pdf',
        prefix: 'invalid',
      },
    },
  ];

  // Product test cases
  const productTypeValidCreateTestCases: E2ETestCase[] = [
    {
      description: 'should create product with valid name',
      input: { name: 'Gaming Laptop' },
    },
    {
      description: 'should create product with valid price',
      input: { name: 'Basic Product', price: 99.99 },
    },
    {
      description: 'should create product with valid stock quantity',
      input: { name: 'Basic Product', stockQuantity: 500 },
    },
    {
      description: 'should create product with valid SKU',
      input: { name: 'Basic Product', sku: 'PRD-12345678' },
    },
    {
      description: 'should create product with valid description',
      input: {
        name: 'Basic Product',
        description: 'This is a very detailed product description with proper punctuation!',
      },
    },
    {
      description: 'should create product with valid category',
      input: { name: 'Basic Product', category: 'Electronics' },
    },
    {
      // This test case creates a product with id 'test-id' for testing update operation below
      description: 'should create product with all valid fields',
      input: {
        id: 'test-id',
        name: 'Premium Gaming Laptop',
        price: 1299.99,
        stockQuantity: 50,
        sku: 'PRD-ABCD1234',
        description: 'High-performance gaming laptop with advanced cooling system. Perfect for modern games!',
        category: 'Electronics',
      },
    },
  ];

  const productTypeValidUpdateTestCases: E2ETestCase[] = [
    {
      description: 'should update product with valid name',
      input: { id: 'test-id', name: 'Updated Laptop' },
    },
    {
      description: 'should update product with valid price',
      input: { id: 'test-id', name: 'Basic Product', price: 199.99 },
    },
    {
      description: 'should update product with valid stock quantity',
      input: { id: 'test-id', name: 'Basic Product', stockQuantity: 750 },
    },
    {
      description: 'should update product with valid SKU',
      input: { id: 'test-id', name: 'Basic Product', sku: 'PRD-87654321' },
    },
    {
      description: 'should update product with valid description',
      input: {
        id: 'test-id',
        name: 'Basic Product',
        description: 'Updated product description with new features and improvements!',
      },
    },
    {
      description: 'should update product with valid category',
      input: { id: 'test-id', name: 'Basic Product', category: 'Computers' },
    },
    {
      description: 'should update product with all valid fields',
      input: {
        id: 'test-id',
        name: 'Updated Gaming Laptop',
        price: 1499.99,
        stockQuantity: 100,
        sku: 'PRD-XYZ98765',
        description: 'Latest model with upgraded specs and enhanced cooling system. Perfect for modern gaming!',
        category: 'Gaming',
      },
    },
  ];

  const productTypeInvalidCreateTestCases: E2ETestCase[] = [
    {
      description: 'should fail to create product with name too short',
      input: { name: 'Test' },
    },
    {
      description: 'should fail to create product with name too long',
      input: { name: 'This product name is way too long and exceeds the maximum length of fifty characters' },
    },
    {
      description: 'should fail to create product with invalid name characters',
      input: { name: 'Product@#$%' },
    },
    {
      description: 'should fail to create product with negative price',
      input: { name: 'Basic Product', price: -10 },
    },
    {
      description: 'should fail to create product with price exceeding maximum',
      input: { name: 'Basic Product', price: 15000 },
    },
    {
      description: 'should fail to create product with negative stock quantity',
      input: { name: 'Basic Product', stockQuantity: -1 },
    },
    {
      description: 'should fail to create product with stock quantity exceeding maximum',
      input: { name: 'Basic Product', stockQuantity: 1500 },
    },
    {
      description: 'should fail to create product with invalid SKU format',
      input: { name: 'Basic Product', sku: 'INVALID-SKU' },
    },
    {
      description: 'should fail to create product with SKU too short',
      input: { name: 'Basic Product', sku: 'PRD-123' },
    },
    {
      description: 'should fail to create product with description too short',
      input: { name: 'Basic Product', description: 'Too short desc' },
    },
    {
      description: 'should fail to create product with description too long',
      input: {
        name: 'Basic Product',
        description: 'A'.repeat(501),
      },
    },
    {
      description: 'should fail to create product with invalid description characters',
      input: {
        name: 'Basic Product',
        description: 'Contains invalid characters like @ and $',
      },
    },
    {
      description: 'should fail to create product with invalid category format',
      input: { name: 'Basic Product', category: 'electronics' },
    },
    {
      description: 'should fail to create product with category too short',
      input: { name: 'Basic Product', category: 'Cat' },
    },
    {
      description: 'should fail to create product with multiple invalid fields',
      input: {
        name: 'A',
        price: -1,
        stockQuantity: -1,
        sku: 'INVALID',
        description: 'Short',
        category: 'invalid',
      },
    },
  ];

  const productTypeInvalidUpdateTestCases: E2ETestCase[] = [
    {
      description: 'should fail to update product with name too short',
      input: { id: 'test-id', name: 'Test' },
    },
    {
      description: 'should fail to update product with name too long',
      input: { id: 'test-id', name: 'This updated product name is way too long and exceeds the maximum length of fifty characters' },
    },
    {
      description: 'should fail to update product with negative price',
      input: { id: 'test-id', name: 'Basic Product', price: -50 },
    },
    {
      description: 'should fail to update product with stock quantity exceeding maximum',
      input: { id: 'test-id', name: 'Basic Product', stockQuantity: 2000 },
    },
    {
      description: 'should fail to update product with invalid SKU format',
      input: { id: 'test-id', name: 'Basic Product', sku: 'INVALID-SKU' },
    },
    {
      description: 'should fail to update product with description too short',
      input: { id: 'test-id', name: 'Basic Product', description: 'Too short update' },
    },
    {
      description: 'should fail to update product with invalid category format',
      input: { id: 'test-id', name: 'Basic Product', category: 'invalid category' },
    },
    {
      description: 'should fail to update product with multiple invalid fields',
      input: {
        id: 'test-id',
        name: 'A',
        price: -1,
        stockQuantity: 2000,
        sku: 'INVALID',
        description: 'Short',
        category: 'invalid',
      },
    },
  ];

  describe('User Type Tests', () => {
    describe('Valid Cases', () => {
      describe('Create Operations', () => {
        const e2eTestCases = createE2ETestCases(userTypeValidCreateTestCases, true);
        test.each(e2eTestCases)('$description', async (testCase) => {
          await runE2eTest(apiEndpoint, apiKey, testCase, 'User', 'Create');
        });
      });

      describe('Update Operations', () => {
        const e2eTestCases = createE2ETestCases(userTypeValidUpdateTestCases, true);
        test.each(e2eTestCases)('$description', async (testCase) => {
          await runE2eTest(apiEndpoint, apiKey, testCase, 'User', 'Update');
        });
      });
    });

    describe('Invalid Cases', () => {
      describe('Create Operations', () => {
        const e2eTestCases = createE2ETestCases(userTypeInvalidCreateTestCases, false);
        test.each(e2eTestCases)('$description', async (testCase) => {
          await runE2eTest(apiEndpoint, apiKey, testCase, 'User', 'Create');
        });
      });

      describe('Update Operations', () => {
        const e2eTestCases = createE2ETestCases(userTypeInvalidUpdateTestCases, false);
        test.each(e2eTestCases)('$description', async (testCase) => {
          await runE2eTest(apiEndpoint, apiKey, testCase, 'User', 'Update');
        });
      });
    });
  });

  describe('Product Type Tests', () => {
    describe('Valid Cases', () => {
      describe('Create Operations', () => {
        const e2eTestCases = createE2ETestCases(productTypeValidCreateTestCases, true);
        test.each(e2eTestCases)('$description', async (testCase) => {
          await runE2eTest(apiEndpoint, apiKey, testCase, 'Product', 'Create');
        });
      });

      describe('Update Operations', () => {
        const e2eTestCases = createE2ETestCases(productTypeValidUpdateTestCases, true);
        test.each(e2eTestCases)('$description', async (testCase) => {
          await runE2eTest(apiEndpoint, apiKey, testCase, 'Product', 'Update');
        });
      });
    });

    describe('Invalid Cases', () => {
      describe('Create Operations', () => {
        const e2eTestCases = createE2ETestCases(productTypeInvalidCreateTestCases, false);
        test.each(e2eTestCases)('$description', async (testCase) => {
          await runE2eTest(apiEndpoint, apiKey, testCase, 'Product', 'Create');
        });
      });

      describe('Update Operations', () => {
        const e2eTestCases = createE2ETestCases(productTypeInvalidUpdateTestCases, false);
        test.each(e2eTestCases)('$description', async (testCase) => {
          await runE2eTest(apiEndpoint, apiKey, testCase, 'Product', 'Update');
        });
      });
    });
  });
});
