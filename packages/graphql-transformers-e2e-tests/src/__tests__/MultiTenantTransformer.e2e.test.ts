/* eslint-disable import/no-extraneous-dependencies */
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { MultiTenantTransformer } from '@aws-amplify/graphql-multitenant-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { Output } from '@aws-sdk/client-cloudformation';
import { ResourceConstants } from 'graphql-transformer-common';
import { default as moment } from 'moment';
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { CloudFormationClient } from '../CloudFormationClient';
import { cleanupStackAfterTest, deploy } from '../deployNestedStacks';
import { GraphQLClient } from '../GraphQLClient';
import { S3Client } from '../S3Client';
import { resolveTestRegion } from '../testSetup';
import {
  createUserPool,
  createUserPoolClient,
  configureAmplify,
  authenticateUser,
  signupUser,
} from '../cognitoUtils';

const region = resolveTestRegion();

jest.setTimeout(2000000);

/**
 * ✅ PROPER E2E TESTS with Cognito User Pool and JWT tokens
 * 
 * These tests verify:
 * - JWT custom:tenantId claim extraction
 * - ConditionExpression-based cross-tenant prevention
 * - ConditionalCheckFailedException behavior
 * - Real tenant isolation at DynamoDB level
 */

const cf = new CloudFormationClient(region);
const customS3Client = new S3Client(region);
const cognitoClient = new CognitoIdentityProviderClient({ region });
const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
const STACK_NAME = `MultiTenantTransformerTests-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `appsync-multi-tenant-transformer-test-bucket-${BUILD_TIMESTAMP}`;
const LOCAL_FS_BUILD_DIR = '/tmp/multi_tenant_transformer_tests/';
const S3_ROOT_DIR_KEY = 'deployments';

let USER_POOL_ID: string;
let GRAPHQL_ENDPOINT: string;
let TENANT_A_CLIENT: GraphQLClient;
let TENANT_B_CLIENT: GraphQLClient;
let TENANT_A_USERNAME = 'tenant-a-user';
let TENANT_B_USERNAME = 'tenant-b-user';

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

beforeAll(async () => {
  const validSchema = `
    type Company @model @multiTenant {
      id: ID!
      name: String!
      industry: String
    }

    type Employee @model @multiTenant {
      id: ID!
      name: String!
      email: String!
      companyId: ID!
    }

    type PublicResource @model {
      id: ID!
      title: String!
    }
  `;

  try {
    await customS3Client.createBucket(BUCKET_NAME);
  } catch (e) {
    console.warn(`Could not create bucket: ${e}`);
  }

  // Create Cognito User Pool with custom:tenantId attribute
  const userPoolResponse = await createUserPool(cognitoClient, `UserPool${STACK_NAME}`, [
    { Name: 'custom:tenantId', AttributeDataType: 'String', Mutable: true },
  ]);
  USER_POOL_ID = userPoolResponse.UserPool!.Id!;

  const userPoolClientResponse = await createUserPoolClient(cognitoClient, USER_POOL_ID, `UserPool${STACK_NAME}`);
  const userPoolClientId = userPoolClientResponse.UserPoolClient!.ClientId!;

  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new MultiTenantTransformer()],
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    },
    transformParameters: {
      sandboxModeEnabled: false,
    },
  });

  // Add Cognito User Pool to outputs
  const cognitoStack = out.rootStack;
  cognitoStack.Outputs![ResourceConstants.OUTPUTS.UserPoolId] = {
    Value: USER_POOL_ID,
  };

  const finishedStack = await deploy(
    customS3Client,
    cf,
    STACK_NAME,
    out,
    { UserPoolId: USER_POOL_ID },
    LOCAL_FS_BUILD_DIR,
    BUCKET_NAME,
    S3_ROOT_DIR_KEY,
    BUILD_TIMESTAMP,
  );

  await cf.wait(10, () => Promise.resolve());
  expect(finishedStack).toBeDefined();

  const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
  GRAPHQL_ENDPOINT = getApiEndpoint(finishedStack.Outputs);
  expect(GRAPHQL_ENDPOINT).toBeDefined();

  // Configure Amplify for Cognito authentication
  configureAmplify(USER_POOL_ID, userPoolClientId);

  // Create test users with different tenantId claims
  const tempPassword = 'TempPassword123!';
  const password = 'Password123!';

  // Tenant A user
  await signupUser(USER_POOL_ID, TENANT_A_USERNAME, tempPassword);
  // Set custom:tenantId attribute
  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: TENANT_A_USERNAME,
      UserAttributes: [{ Name: 'custom:tenantId', Value: 'tenant-a' }],
    }),
  );
  const tenantASession = await authenticateUser(TENANT_A_USERNAME, tempPassword, password);
  const tenantAToken = tenantASession.getIdToken().getJwtToken();
  TENANT_A_CLIENT = new GraphQLClient(GRAPHQL_ENDPOINT, {
    Authorization: tenantAToken,
  });

  // Tenant B user
  await signupUser(USER_POOL_ID, TENANT_B_USERNAME, tempPassword);
  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: TENANT_B_USERNAME,
      UserAttributes: [{ Name: 'custom:tenantId', Value: 'tenant-b' }],
    }),
  );
  const tenantBSession = await authenticateUser(TENANT_B_USERNAME, tempPassword, password);
  const tenantBToken = tenantBSession.getIdToken().getJwtToken();
  TENANT_B_CLIENT = new GraphQLClient(GRAPHQL_ENDPOINT, {
    Authorization: tenantBToken,
  });
});

afterAll(async () => {
  await cleanupStackAfterTest(BUCKET_NAME, STACK_NAME, cf, { cognitoClient, userPoolId: USER_POOL_ID });
});

/**
 * ✅ Test 1: Create Operation - Automatic tenantId injection from JWT
 */
test('create operation should automatically inject tenantId from JWT custom claim', async () => {
  const createMutation = /* GraphQL */ `
    mutation CreateCompany($input: CreateCompanyInput!) {
      createCompany(input: $input) {
        id
        name
        industry
        tenantId
        createdAt
      }
    }
  `;

  // Create company as tenant-a (NO tenantId in input!)
  const result = await TENANT_A_CLIENT.query(createMutation, {
    input: {
      name: 'Acme Corporation',
      industry: 'Technology',
      // tenantId is NOT provided - should be auto-injected from JWT
    },
  });

  expect(result.data.createCompany).toBeDefined();
  expect(result.data.createCompany.name).toEqual('Acme Corporation');
  expect(result.data.createCompany.tenantId).toEqual('tenant-a'); // Auto-injected!
  expect(result.data.createCompany.id).toBeDefined();
});

/**
 * ✅ Test 2: List Operation - Tenant-scoped queries with GSI
 */
test('list operation should only return items belonging to authenticated tenant', async () => {
  const createMutation = /* GraphQL */ `
    mutation CreateCompany($input: CreateCompanyInput!) {
      createCompany(input: $input) {
        id
        name
        tenantId
      }
    }
  `;

  // Create companies for both tenants
  await TENANT_A_CLIENT.query(createMutation, {
    input: { name: 'Tenant A Company 1' },
  });
  await TENANT_A_CLIENT.query(createMutation, {
    input: { name: 'Tenant A Company 2' },
  });
  await TENANT_B_CLIENT.query(createMutation, {
    input: { name: 'Tenant B Company 1' },
  });

  // List companies as tenant-a
  const listQuery = /* GraphQL */ `
    query ListCompanies {
      listCompanies {
        items {
          id
          name
          tenantId
        }
      }
    }
  `;

  const resultA = await TENANT_A_CLIENT.query(listQuery, {});

  expect(resultA.data.listCompanies.items).toBeDefined();
  expect(resultA.data.listCompanies.items.length).toBeGreaterThanOrEqual(2);
  // All items should belong to tenant-a
  resultA.data.listCompanies.items.forEach((item: any) => {
    expect(item.tenantId).toEqual('tenant-a');
  });

  // List companies as tenant-b
  const resultB = await TENANT_B_CLIENT.query(listQuery, {});

  expect(resultB.data.listCompanies.items).toBeDefined();
  expect(resultB.data.listCompanies.items.length).toBeGreaterThanOrEqual(1);
  // All items should belong to tenant-b
  resultB.data.listCompanies.items.forEach((item: any) => {
    expect(item.tenantId).toEqual('tenant-b');
  });

  // Tenant A should NOT see Tenant B's companies
  const tenantBCompanyNames = resultB.data.listCompanies.items.map((item: any) => item.name);
  const tenantACompanyNames = resultA.data.listCompanies.items.map((item: any) => item.name);
  tenantBCompanyNames.forEach((name: string) => {
    expect(tenantACompanyNames).not.toContain(name);
  });
});

/**
 * ✅ Test 3: Get Operation - Post-fetch validation
 */
test('get operation should validate tenantId in response', async () => {
  const createMutation = /* GraphQL */ `
    mutation CreateCompany($input: CreateCompanyInput!) {
      createCompany(input: $input) {
        id
        name
        tenantId
      }
    }
  `;

  // Create company as tenant-a
  const createResult = await TENANT_A_CLIENT.query(createMutation, {
    input: { name: 'Test Company for Get' },
  });
  const companyId = createResult.data.createCompany.id;

  // Get the company as tenant-a (should succeed)
  const getQuery = /* GraphQL */ `
    query GetCompany($id: ID!) {
      getCompany(id: $id) {
        id
        name
        tenantId
      }
    }
  `;

  const getResult = await TENANT_A_CLIENT.query(getQuery, { id: companyId });
  expect(getResult.data.getCompany).toBeDefined();
  expect(getResult.data.getCompany.tenantId).toEqual('tenant-a');

  // Try to get the same company as tenant-b (should fail)
  const getResultB = await TENANT_B_CLIENT.query(getQuery, { id: companyId });
  expect(getResultB.errors).toBeDefined();
  expect(getResultB.errors[0].message).toContain('Unauthorized');
  expect(getResultB.data.getCompany).toBeNull();
});

/**
 * ✅ Test 4: CRITICAL - Update Operation Cross-Tenant Prevention
 */
test('update operation should REJECT cross-tenant update with ConditionExpression', async () => {
  const createMutation = /* GraphQL */ `
    mutation CreateCompany($input: CreateCompanyInput!) {
      createCompany(input: $input) {
        id
        name
        industry
        tenantId
      }
    }
  `;

  // Tenant A creates a company
  const createResult = await TENANT_A_CLIENT.query(createMutation, {
    input: { name: 'Secure Company', industry: 'Tech' },
  });
  const companyId = createResult.data.createCompany.id;

  // Tenant B attempts to update Tenant A's company (ATTACK!)
  const updateMutation = /* GraphQL */ `
    mutation UpdateCompany($input: UpdateCompanyInput!) {
      updateCompany(input: $input) {
        id
        name
        industry
        tenantId
      }
    }
  `;

  const attackResult = await TENANT_B_CLIENT.query(updateMutation, {
    input: {
      id: companyId,
      name: 'Hacked Company',
      industry: 'Malicious',
    },
  });

  // Should be rejected with ConditionalCheckFailedException
  expect(attackResult.errors).toBeDefined();
  expect(
    attackResult.errors[0].message.includes('ConditionalCheckFailedException') ||
      attackResult.errors[0].message.includes('DynamoDB:ConditionalCheckFailedException') ||
      attackResult.errors[0].errorType === 'DynamoDB:ConditionalCheckFailedException',
  ).toBe(true);

  // Verify database was NOT modified
  const getQuery = /* GraphQL */ `
    query GetCompany($id: ID!) {
      getCompany(id: $id) {
        id
        name
        industry
        tenantId
      }
    }
  `;

  const verifyResult = await TENANT_A_CLIENT.query(getQuery, { id: companyId });
  expect(verifyResult.data.getCompany).toBeDefined();
  expect(verifyResult.data.getCompany.name).toEqual('Secure Company'); // NOT 'Hacked Company'
  expect(verifyResult.data.getCompany.industry).toEqual('Tech'); // NOT 'Malicious'
  expect(verifyResult.data.getCompany.tenantId).toEqual('tenant-a');

  // Tenant A can successfully update their own company
  const legitimateUpdate = await TENANT_A_CLIENT.query(updateMutation, {
    input: {
      id: companyId,
      industry: 'Finance',
    },
  });

  expect(legitimateUpdate.data.updateCompany).toBeDefined();
  expect(legitimateUpdate.data.updateCompany.industry).toEqual('Finance');
  expect(legitimateUpdate.data.updateCompany.tenantId).toEqual('tenant-a');
});

/**
 * ✅ Test 5: CRITICAL - Delete Operation Cross-Tenant Prevention
 */
test('delete operation should REJECT cross-tenant delete with ConditionExpression', async () => {
  const createMutation = /* GraphQL */ `
    mutation CreateCompany($input: CreateCompanyInput!) {
      createCompany(input: $input) {
        id
        name
        tenantId
      }
    }
  `;

  // Tenant A creates a company
  const createResult = await TENANT_A_CLIENT.query(createMutation, {
    input: { name: 'Protected Company' },
  });
  const companyId = createResult.data.createCompany.id;

  // Tenant B attempts to delete Tenant A's company (ATTACK!)
  const deleteMutation = /* GraphQL */ `
    mutation DeleteCompany($input: DeleteCompanyInput!) {
      deleteCompany(input: $input) {
        id
        name
        tenantId
      }
    }
  `;

  const attackResult = await TENANT_B_CLIENT.query(deleteMutation, {
    input: { id: companyId },
  });

  // Should be rejected with ConditionalCheckFailedException
  expect(attackResult.errors).toBeDefined();
  expect(
    attackResult.errors[0].message.includes('ConditionalCheckFailedException') ||
      attackResult.errors[0].message.includes('DynamoDB:ConditionalCheckFailedException') ||
      attackResult.errors[0].errorType === 'DynamoDB:ConditionalCheckFailedException',
  ).toBe(true);

  // Verify company still exists
  const getQuery = /* GraphQL */ `
    query GetCompany($id: ID!) {
      getCompany(id: $id) {
        id
        name
        tenantId
      }
    }
  `;

  const verifyResult = await TENANT_A_CLIENT.query(getQuery, { id: companyId });
  expect(verifyResult.data.getCompany).toBeDefined();
  expect(verifyResult.data.getCompany.name).toEqual('Protected Company');
  expect(verifyResult.data.getCompany.tenantId).toEqual('tenant-a');

  // Tenant A can successfully delete their own company
  const legitimateDelete = await TENANT_A_CLIENT.query(deleteMutation, {
    input: { id: companyId },
  });

  expect(legitimateDelete.data.deleteCompany).toBeDefined();
  expect(legitimateDelete.data.deleteCompany.id).toEqual(companyId);

  // Verify company is deleted
  const verifyDeleted = await TENANT_A_CLIENT.query(getQuery, { id: companyId });
  expect(verifyDeleted.data.getCompany).toBeNull();
});

/**
 * ✅ Test 6: Multi-type support with consistent tenant isolation
 */
test('should support multiple types with consistent tenant isolation', async () => {
  const createCompanyMutation = /* GraphQL */ `
    mutation CreateCompany($input: CreateCompanyInput!) {
      createCompany(input: $input) {
        id
        name
        tenantId
      }
    }
  `;

  const createEmployeeMutation = /* GraphQL */ `
    mutation CreateEmployee($input: CreateEmployeeInput!) {
      createEmployee(input: $input) {
        id
        name
        email
        tenantId
      }
    }
  `;

  // Tenant A creates company and employee
  const companyResult = await TENANT_A_CLIENT.query(createCompanyMutation, {
    input: { name: 'Multi Type Company' },
  });

  const employeeResult = await TENANT_A_CLIENT.query(createEmployeeMutation, {
    input: {
      name: 'John Doe',
      email: 'john@example.com',
      companyId: companyResult.data.createCompany.id,
    },
  });

  // Both should have tenant-a
  expect(companyResult.data.createCompany.tenantId).toEqual('tenant-a');
  expect(employeeResult.data.createEmployee.tenantId).toEqual('tenant-a');

  // Tenant B should not see tenant A's employees
  const listEmployeesQuery = /* GraphQL */ `
    query ListEmployees {
      listEmployees {
        items {
          id
          name
          tenantId
        }
      }
    }
  `;

  const tenantBEmployees = await TENANT_B_CLIENT.query(listEmployeesQuery, {});
  const tenantBEmployeeIds = tenantBEmployees.data.listEmployees.items.map((e: any) => e.id);
  expect(tenantBEmployeeIds).not.toContain(employeeResult.data.createEmployee.id);
});

/**
 * ✅ Test 7: Public resource should not have tenantId field
 */
test('public resource should work without tenantId and be accessible to all', async () => {
  const createMutation = /* GraphQL */ `
    mutation CreatePublicResource($input: CreatePublicResourceInput!) {
      createPublicResource(input: $input) {
        id
        title
      }
    }
  `;

  // Tenant A creates a public resource
  const resultA = await TENANT_A_CLIENT.query(createMutation, {
    input: { title: 'Public Document' },
  });

  expect(resultA.data.createPublicResource).toBeDefined();
  expect(resultA.data.createPublicResource.title).toEqual('Public Document');
  // tenantId should not exist on this type
  expect(resultA.data.createPublicResource.tenantId).toBeUndefined();

  // Tenant B can see the same public resource (if queried by ID)
  const getQuery = /* GraphQL */ `
    query GetPublicResource($id: ID!) {
      getPublicResource(id: $id) {
        id
        title
      }
    }
  `;

  const resultB = await TENANT_B_CLIENT.query(getQuery, {
    id: resultA.data.createPublicResource.id,
  });

  expect(resultB.data.getPublicResource).toBeDefined();
  expect(resultB.data.getPublicResource.id).toEqual(resultA.data.createPublicResource.id);
});

/**
 * ✅ Test 8: Verify tenantId cannot be spoofed in input
 */
test('should prevent tenantId spoofing in create input', async () => {
  const createMutation = /* GraphQL */ `
    mutation CreateCompany($input: CreateCompanyInput!) {
      createCompany(input: $input) {
        id
        name
        tenantId
      }
    }
  `;

  // Tenant A tries to create a company with tenant-b's ID (ATTACK!)
  const result = await TENANT_A_CLIENT.query(createMutation, {
    input: {
      name: 'Spoofed Company',
      tenantId: 'tenant-b', // Attempting to spoof tenantId
    },
  });

  // tenantId should be overridden by JWT claim
  expect(result.data.createCompany).toBeDefined();
  expect(result.data.createCompany.tenantId).toEqual('tenant-a'); // NOT 'tenant-b'

  // Tenant B should NOT see this company
  const listQuery = /* GraphQL */ `
    query ListCompanies {
      listCompanies {
        items {
          id
          name
          tenantId
        }
      }
    }
  `;

  const tenantBCompanies = await TENANT_B_CLIENT.query(listQuery, {});
  const companyNames = tenantBCompanies.data.listCompanies.items.map((c: any) => c.name);
  expect(companyNames).not.toContain('Spoofed Company');
});
