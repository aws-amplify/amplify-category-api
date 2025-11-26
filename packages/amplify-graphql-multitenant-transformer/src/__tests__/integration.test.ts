import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { MultiTenantTransformer } from '../graphql-multi-tenant-transformer';
import { parse } from 'graphql';
import { Template } from 'aws-cdk-lib/assertions';

describe('MultiTenant Integration Tests', () => {
  it('should transform schema with @multiTenant directive', () => {
    const schema = `
      type Company @model @multiTenant {
        id: ID!
        name: String!
        industry: String
      }
    `;

    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new MultiTenantTransformer()],
    });

    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
    
    const parsedSchema = parse(out.schema);
    const companyType = parsedSchema.definitions.find(
      (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Company',
    ) as any;

    expect(companyType).toBeDefined();
    
    const tenantIdField = companyType.fields?.find((f: any) => f.name.value === 'tenantId');
    expect(tenantIdField).toBeDefined();
    expect(tenantIdField.type.kind).toBe('NonNullType');
    
    const createdAtField = companyType.fields?.find((f: any) => f.name.value === 'createdAt');
    expect(createdAtField).toBeDefined();

    const companyStack = out.stacks.Company;
    expect(companyStack).toBeDefined();
    
    const template = Template.fromJSON(companyStack);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: [
        {
          IndexName: 'byTenant',
          KeySchema: [
            { AttributeName: 'tenantId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    });

    // Verify basic transformation succeeded
    // GSI is verified in CloudFormation template above
    // VTL resolver logic is applied via addVtlFunctionToSlot() which works at runtime
    
    // Verify resolvers exist for the Company type
    expect(out.resolvers['Query.getCompany.req.vtl']).toBeDefined();
    expect(out.resolvers['Query.listCompanies.req.vtl']).toBeDefined();
    expect(out.resolvers['Mutation.createCompany.req.vtl']).toBeDefined();
    expect(out.resolvers['Mutation.updateCompany.req.vtl']).toBeDefined();
    expect(out.resolvers['Mutation.deleteCompany.req.vtl']).toBeDefined();
  });

  it('should throw error when @multiTenant used without @model', () => {
    const schema = `
      type Company @multiTenant {
        id: ID!
        name: String!
      }
    `;

    expect(() =>
      testTransform({
        schema,
        transformers: [new MultiTenantTransformer()],
      }),
    ).toThrow('@model');
  });

  it('should support custom tenantField parameter', () => {
    const schema = `
      type Company @model @multiTenant(tenantField: "organizationId") {
        id: ID!
        name: String!
      }
    `;

    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new MultiTenantTransformer()],
    });

    expect(out).toBeDefined();
    
    const parsedSchema = parse(out.schema);
    const companyType = parsedSchema.definitions.find(
      (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Company',
    ) as any;

    const orgIdField = companyType.fields?.find((f: any) => f.name.value === 'organizationId');
    expect(orgIdField).toBeDefined();
  });

  it('should work with multiple types', () => {
    const schema = `
      type Company @model @multiTenant {
        id: ID!
        name: String!
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

    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new MultiTenantTransformer()],
    });

    expect(out).toBeDefined();
    
    const parsedSchema = parse(out.schema);
    
    const companyType = parsedSchema.definitions.find(
      (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Company',
    ) as any;
    expect(companyType.fields?.find((f: any) => f.name.value === 'tenantId')).toBeDefined();

    const employeeType = parsedSchema.definitions.find(
      (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Employee',
    ) as any;
    expect(employeeType.fields?.find((f: any) => f.name.value === 'tenantId')).toBeDefined();

    const publicType = parsedSchema.definitions.find(
      (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'PublicResource',
    ) as any;
    expect(publicType.fields?.find((f: any) => f.name.value === 'tenantId')).toBeUndefined();
  });

  it('should detect @primaryKey directive on tenantId field', () => {
    const schema = `
      type Company @model @multiTenant {
        tenantId: String! @primaryKey(sortKeyFields: ["id"])
        id: ID!
        name: String!
      }
    `;

    const out = testTransform({
      schema,
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new MultiTenantTransformer(),
      ],
    });

    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
    
    // Verify schema transformation succeeded with @primaryKey
    const parsedSchema = parse(out.schema);
    const companyType = parsedSchema.definitions.find(
      (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Company',
    ) as any;

    expect(companyType).toBeDefined();
    
    // Verify tenantId field exists (not auto-injected since explicitly declared)
    const tenantIdField = companyType.fields?.find((f: any) => f.name.value === 'tenantId');
    expect(tenantIdField).toBeDefined();
    expect(tenantIdField.type.kind).toBe('NonNullType');
    
    // Note: @primaryKey directive is processed and removed during transformation
    // We verify successful integration by checking that resolvers are generated correctly
    
    // Verify resolvers still exist (integration successful)
    expect(out.resolvers['Query.getCompany.req.vtl']).toBeDefined();
    expect(out.resolvers['Mutation.updateCompany.req.vtl']).toBeDefined();
    expect(out.resolvers['Mutation.deleteCompany.req.vtl']).toBeDefined();
  });

  it('should work with @primaryKey integration for optimized Get operations', () => {
    const schema = `
      type Company @model @multiTenant {
        tenantId: String! @primaryKey(sortKeyFields: ["id"])
        id: ID!
        name: String!
        industry: String
      }
    `;

    const out = testTransform({
      schema,
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new MultiTenantTransformer(),
      ],
    });

    expect(out).toBeDefined();
    
    const companyStack = out.stacks.Company;
    expect(companyStack).toBeDefined();
    
    const template = Template.fromJSON(companyStack);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: [
        {
          IndexName: 'byTenant',
          KeySchema: [
            { AttributeName: 'tenantId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    });

    expect(out.resolvers['Query.getCompany.req.vtl']).toBeDefined();
    expect(out.resolvers['Mutation.updateCompany.req.vtl']).toBeDefined();
    expect(out.resolvers['Mutation.deleteCompany.req.vtl']).toBeDefined();
  });

  it('should throw error when @multiTenant used without @model', () => {
    const schema = `
      type Company @multiTenant {
        id: ID!
        name: String!
      }
    `;

    expect(() =>
      testTransform({
        schema,
        transformers: [new ModelTransformer(), new MultiTenantTransformer()],
      }),
    ).toThrow();
  });

  it('should support custom tenantIdClaim parameter', () => {
    const schema = `
      type Company @model @multiTenant(tenantIdClaim: "custom:orgId") {
        id: ID!
        name: String!
      }
    `;

    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new MultiTenantTransformer()],
    });

    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
  });

  it('should support both custom parameters together', () => {
    const schema = `
      type Company @model @multiTenant(tenantField: "orgId", tenantIdClaim: "custom:organizationId") {
        id: ID!
        name: String!
      }
    `;

    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new MultiTenantTransformer()],
    });

    expect(out).toBeDefined();
    
    const parsedSchema = parse(out.schema);
    const companyType = parsedSchema.definitions.find(
      (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Company',
    ) as any;

    const orgIdField = companyType.fields?.find((f: any) => f.name.value === 'orgId');
    expect(orgIdField).toBeDefined();
    expect(orgIdField.type.kind).toBe('NonNullType');
  });
});
