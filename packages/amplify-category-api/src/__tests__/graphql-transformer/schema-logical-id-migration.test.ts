import { isMigratingFromV1SchemaLogicalId } from '../../graphql-transformer/schema-logical-id-migration';

describe('isMigratingFromV1SchemaLogicalId', () => {
  const v1SchemaResource = { Type: 'AWS::AppSync::GraphQLSchema', Properties: {} };

  it('returns false when there is no previous deployment', () => {
    expect(isMigratingFromV1SchemaLogicalId(undefined)).toBe(false);
  });

  it('returns true when a built nested stack carries the schema at logical ID GraphQLSchema', () => {
    const config = {
      build: {
        stacks: {
          'MyApi.json': JSON.stringify({ Resources: { GraphQLSchema: v1SchemaResource } }),
        },
      },
    };
    expect(isMigratingFromV1SchemaLogicalId(config)).toBe(true);
  });

  it('accepts an already-parsed template object as well as a JSON string', () => {
    const config = {
      build: {
        stacks: {
          'MyApi.json': { Resources: { GraphQLSchema: v1SchemaResource } },
        },
      },
    };
    expect(isMigratingFromV1SchemaLogicalId(config)).toBe(true);
  });

  it('returns false for a born-v2 template with the CDK-hashed schema logical ID', () => {
    const config = {
      build: {
        stacks: {
          'MyApi.json': JSON.stringify({
            Resources: { GraphQLAPITransformerSchema3CB2AE18: v1SchemaResource },
          }),
        },
      },
    };
    expect(isMigratingFromV1SchemaLogicalId(config)).toBe(false);
  });

  it('returns false when GraphQLSchema exists but is not an AppSync schema resource', () => {
    const config = {
      build: {
        stacks: {
          'MyApi.json': JSON.stringify({ Resources: { GraphQLSchema: { Type: 'AWS::SomethingElse' } } }),
        },
      },
    };
    expect(isMigratingFromV1SchemaLogicalId(config)).toBe(false);
  });

  it('ignores unparseable stack template strings', () => {
    const config = { build: { stacks: { 'MyApi.json': 'not json {{{' } } };
    expect(isMigratingFromV1SchemaLogicalId(config)).toBe(false);
  });

  it('detects via the unbuilt stacks map fallback', () => {
    const config = { stacks: { 'MyApi.json': { Resources: { GraphQLSchema: v1SchemaResource } } } };
    expect(isMigratingFromV1SchemaLogicalId(config)).toBe(true);
  });
});
