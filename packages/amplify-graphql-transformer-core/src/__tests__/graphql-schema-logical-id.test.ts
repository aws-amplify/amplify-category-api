import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GraphQLApi } from '../graphql-api';

/**
 * Regression tests for the Gen1 v1->v2 migration `AWS::AppSync::GraphQLSchema` logical-ID
 * collision (SIM D493523433).
 *
 * The schema physical ID is deterministic (`<apiId>GraphQLSchema`, one schema per API). When a
 * v1->v2 migration renames the schema logical ID from the v1 `GraphQLSchema` to the v2
 * CDK-generated `GraphQLAPITransformerSchema<hash>`, CloudFormation does a create-before-delete in
 * which the new resource resolves to the same physical ID as the not-yet-deleted old one, failing
 * with `<apiId>GraphQLSchema already exists in stack`.
 *
 * `preserveGraphQLSchemaLogicalId` pins the logical ID to `GraphQLSchema` so the migration is an
 * in-place update. It must be opt-in: the default (born-v2) behavior keeps the hashed logical ID
 * so existing Gen2 stacks are not themselves renamed.
 */
const makeApi = (preserveGraphQLSchemaLogicalId?: boolean): Stack => {
  const app = new App();
  const stack = new Stack(app, 'test-root-stack');
  const assetProvider = {
    // The schema construct lazily reads `s3ObjectUrl` off the provided asset when the template is
    // synthesized, so the mock must return an object carrying it.
    provide: jest.fn().mockReturnValue({ s3ObjectUrl: 's3://test-bucket/schema.graphql' }),
  };
  // eslint-disable-next-line no-new
  new GraphQLApi(stack, 'testId', {
    name: 'testApiName',
    assetProvider: assetProvider as any,
    ...(preserveGraphQLSchemaLogicalId === undefined ? {} : { preserveGraphQLSchemaLogicalId }),
  });
  return stack;
};

const schemaLogicalIds = (stack: Stack): string[] => {
  const template = Template.fromStack(stack);
  return Object.keys(template.findResources('AWS::AppSync::GraphQLSchema'));
};

describe('GraphQLSchema logical id', () => {
  it('defaults to the CDK-generated <parent>TransformerSchema<hash> logical id', () => {
    const ids = schemaLogicalIds(makeApi());
    expect(ids).toHaveLength(1);
    // Parent construct id ('testId' here; 'GraphQLAPI' in the real transform pipeline) + the
    // 'TransformerSchema' construct id + CDK's uniqueness hash. The point is it is NOT 'GraphQLSchema'.
    expect(ids[0]).toMatch(/TransformerSchema[0-9A-F]+$/);
    expect(ids[0]).not.toEqual('GraphQLSchema');
  });

  it('preserves the Gen1 GraphQLSchema logical id when preserveGraphQLSchemaLogicalId is true', () => {
    const ids = schemaLogicalIds(makeApi(true));
    expect(ids).toEqual(['GraphQLSchema']);
  });

  it('is byte-identical to the default when the flag is explicitly false', () => {
    expect(schemaLogicalIds(makeApi(false))).toEqual(schemaLogicalIds(makeApi()));
  });
});
