import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { MultiTenantTransformer } from '../graphql-multi-tenant-transformer';

describe('MultiTenantTransformer with DynamoDB Lookup', () => {
  it('should compile schema with lookup configuration', () => {
    const validSchema = `
      type UserTenant @model {
        userId: ID! @primaryKey
        tenantIds: [String]
      }

      type Todo @model @multiTenant(
        lookupModel: "UserTenant"
        lookupKey: "userId"
        lookupClaim: "sub"
        lookupOutputField: "tenantIds"
      ) {
        id: ID!
        content: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [
        new ModelTransformer(), 
        new PrimaryKeyTransformer(),
        new MultiTenantTransformer()
      ],
    });

    expect(out).toBeDefined();
    
    // Check if the lookup resolver exists and contains GetItem
    const lookupResolver = out.resolvers['Mutation.createTodo.lookup.req.vtl'];
    expect(lookupResolver).toBeDefined();
    expect(lookupResolver).toContain('GetItem');
    expect(lookupResolver).toContain('userId');
    expect(lookupResolver).toContain('sub');

    // Check if the validation resolver uses the stash
    const validationResolver = out.resolvers['Mutation.createTodo.preAuth.req.vtl'];
    expect(validationResolver).toBeDefined();
    expect(validationResolver).toContain('$ctx.stash.allowedTenants');
  });
});