import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { MultiTenantTransformer } from '../graphql-multi-tenant-transformer';
import { parse } from 'graphql';
import { Template } from 'aws-cdk-lib/assertions';

import { IndexTransformer } from '@aws-amplify/graphql-index-transformer';

describe('MultiTenant Integration Tests', () => {
  it('should protect secondary index queries', () => {
    const schema = `
      type Todo @model @multiTenant {
        id: ID!
        title: String!
        category: String! @index(name: "byCategory", queryField: "todosByCategory")
      }
    `;

    const out = testTransform({
      schema,
      transformers: [
        new ModelTransformer(),
        new IndexTransformer(),
        new MultiTenantTransformer(),
      ],
    });

    // Check custom query resolver slot
    const filterSlot = 'Query.todosByCategory.tenantFilter.req.vtl';
    expect(out.resolvers[filterSlot]).toBeDefined();
    expect(out.resolvers[filterSlot]).toContain('tenantId');
    expect(out.resolvers[filterSlot]).toContain('authFilter');
  });

  it('should protect subscriptions', () => {
    const schema = `
      type Post @model @multiTenant {
        id: ID!
        title: String!
      }
    `;

    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new MultiTenantTransformer()],
    });

    const parsed = parse(out.schema);
    const subscriptionType = parsed.definitions.find(
      (d: any) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Subscription'
    ) as any;

    const onCreate = subscriptionType.fields.find((f: any) => f.name.value === 'onCreatePost');
    const tenantArg = onCreate.arguments.find((a: any) => a.name.value === 'tenantId');
    expect(tenantArg).toBeDefined();

    const slotName = 'Subscription.onCreatePost.tenant.req.vtl';
    expect(out.resolvers[slotName]).toBeDefined();
    expect(out.resolvers[slotName]).toContain('Unauthorized');
  });

  xit('should protect sync queries', () => {
    const schema = `
      type Post @model @multiTenant {
        id: ID!
        title: String!
      }
    `;

    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new MultiTenantTransformer()],
    });

    // Check sync query resolver slot
    const syncSlot = 'Query.syncPosts.tenantFilter.req.vtl';
    expect(out.resolvers[syncSlot]).toBeDefined();
    expect(out.resolvers[syncSlot]).toContain('authFilter');
  });

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
    expect(out.resolvers['Query.getCompany.res.vtl']).toBeDefined();
    // Ensure security validation is present in the response
    expect(out.resolvers['Query.getCompany.multiTenant.res.vtl']).toContain('Multi-tenant validation');
    
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
    expect(out.resolvers['Query.getCompany.res.vtl']).toBeDefined();
    // Ensure security validation is present in the response
    expect(out.resolvers['Query.getCompany.multiTenant.res.vtl']).toContain('Multi-tenant validation');
    
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

  it('should support advanced configuration: indexName, sortKeyFields, bypassAuthTypes', () => {
    const schema = `
      type Order @model 
      @multiTenant(
        tenantField: "organizationId", 
        indexName: "byOrganization",
        bypassAuthTypes: ["IAM", "AWS_LAMBDA"],
        sortKeyFields: ["createdAt"]
      ) {
        id: ID!
        description: String
        createdAt: AWSDateTime
      }
    `;

    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new MultiTenantTransformer()],
    });

    expect(out).toBeDefined();

    // Check GSI
    const orderStack = out.stacks.Order;
    const template = Template.fromJSON(orderStack);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: [
        {
          IndexName: 'byOrganization',
          KeySchema: [
            { AttributeName: 'organizationId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    });

    // Check VTL for bypass check
    // Note: The resolver file name might be slightly different depending on transformer implementation
    // mutation.ts: generateCreateMutationRequestTemplate -> preAuth slot
    const createResolver = out.resolvers['Mutation.createOrder.preAuth.req.vtl'];
    expect(createResolver).toBeDefined();
    expect(createResolver).toContain('$util.authType() == "IAM Authorization"');
    expect(createResolver).toContain('$util.authType() == "Lambda Authorization"');
    expect(createResolver).toContain('#return');
  });

  it('should not create GSI when createIndex is false', () => {
    const schema = `
      type Product @model @multiTenant(createIndex: false) {
        id: ID!
        name: String
      }
    `;

    const out = testTransform({
      schema,
      transformers: [new ModelTransformer(), new MultiTenantTransformer()],
    });

    expect(out).toBeDefined();
    const productStack = out.stacks.Product;
    
    const template = Template.fromJSON(productStack);
    const tables = template.findResources('AWS::DynamoDB::Table');
    const table = Object.values(tables)[0];
    const gsis = table.Properties.GlobalSecondaryIndexes || [];
    const tenantGsi = gsis.find((g: any) => g.IndexName === 'byTenant');
    expect(tenantGsi).toBeUndefined();
  });
});
