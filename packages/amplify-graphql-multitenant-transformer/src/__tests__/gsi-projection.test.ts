import { MultiTenantTransformer } from '../graphql-multi-tenant-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';

test('successfully adds GSI with projection type INCLUDE', () => {
  const schema = `
    type Todo @model @multiTenant(projectionType: "INCLUDE", projectionKeys: ["name", "description"]) {
      id: ID!
      name: String!
      description: String
      secretInfo: String
    }
  `;

  const out = testTransform({
    schema,
    transformers: [new ModelTransformer(), new MultiTenantTransformer()],
  });
  
  // Verify the schema parsed correctly
  expect(out).toBeDefined();

  // Inspect the generated CloudFormation stack
  const stack = out.stacks['Todo'];
  expect(stack).toBeDefined();

  // Find the DynamoDB Table resource
  const resources = stack.Resources || {};
  const tableResource = Object.values(resources).find(
    (r: any) => r.Type === 'AWS::DynamoDB::Table'
  ) as any;

  expect(tableResource).toBeDefined();

  // Check GlobalSecondaryIndexes
  const gsis = tableResource.Properties.GlobalSecondaryIndexes;
  expect(gsis).toBeDefined();
  
  // Find the tenant index (starts with byTenant usually, or verify properties)
  const tenantIndex = gsis.find((gsi: any) => 
    gsi.KeySchema.some((k: any) => k.AttributeName === 'tenantId')
  );
  
  expect(tenantIndex).toBeDefined();
  expect(tenantIndex.Projection.ProjectionType).toEqual('INCLUDE');
  expect(tenantIndex.Projection.NonKeyAttributes).toEqual(expect.arrayContaining(['name', 'description']));
  expect(tenantIndex.Projection.NonKeyAttributes).not.toContain('secretInfo');
});

test('successfully adds GSI with projection type KEYS_ONLY', () => {
  const schema = `
    type Todo @model @multiTenant(projectionType: "KEYS_ONLY") {
      id: ID!
      name: String!
    }
  `;

  const out = testTransform({
    schema,
    transformers: [new ModelTransformer(), new MultiTenantTransformer()],
  });

  const stack = out.stacks['Todo'];
  const resources = stack.Resources || {};
  const tableResource = Object.values(resources).find(
    (r: any) => r.Type === 'AWS::DynamoDB::Table'
  ) as any;

  const tenantIndex = tableResource.Properties.GlobalSecondaryIndexes.find((gsi: any) => 
    gsi.KeySchema.some((k: any) => k.AttributeName === 'tenantId')
  );

  expect(tenantIndex.Projection.ProjectionType).toEqual('KEYS_ONLY');
  expect(tenantIndex.Projection.NonKeyAttributes).toBeUndefined();
});

test('throws error if INCLUDE is used without projectionKeys', () => {
  const schema = `
    type Todo @model @multiTenant(projectionType: "INCLUDE") {
      id: ID!
      name: String!
    }
  `;

  expect(() => testTransform({
    schema,
    transformers: [new ModelTransformer(), new MultiTenantTransformer()],
  })).toThrowError(
    'When using projectionType "INCLUDE", you must provide "projectionKeys"'
  );
});
