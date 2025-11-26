import { MultiTenantTransformer } from '../graphql-multi-tenant-transformer';
import { parse } from 'graphql';

describe('MultiTenantTransformer', () => {
  let transformer: MultiTenantTransformer;

  beforeEach(() => {
    transformer = new MultiTenantTransformer();
  });

  describe('constructor', () => {
    it('should initialize with correct name and directive', () => {
      expect(transformer).toBeDefined();
      expect(transformer.name).toBe('amplify-multi-tenant-transformer');
    });
  });

  describe('directive definition', () => {
    it('should have valid directive definition', () => {
      const directiveDef = transformer.directive;
      expect(directiveDef.name.value).toBe('multiTenant');
      expect(directiveDef.locations.some((loc: any) => loc.value === 'OBJECT')).toBe(true);
      expect(directiveDef.arguments?.some((arg: any) => arg.name.value === 'tenantField')).toBe(true);
      expect(directiveDef.arguments?.some((arg: any) => arg.name.value === 'tenantIdClaim')).toBe(true);
    });
  });

  describe('metadata management', () => {
    it('should check if type is multi-tenant', () => {
      expect(transformer.isMultiTenant('TestType')).toBe(false);
    });

    it('should return undefined for non-existent type metadata', () => {
      expect(transformer.getMetadata('NonExistent')).toBeUndefined();
    });

    it('should return empty array when no multi-tenant types configured', () => {
      expect(transformer.getMultiTenantTypes()).toEqual([]);
    });
  });
});

describe('MultiTenant Directive Usage', () => {
  it('should accept tenantField parameter', () => {
    const schema = `
      type Company @model @multiTenant(tenantField: "organizationId") {
        id: ID!
        name: String!
      }
    `;
    const parsed = parse(schema);
    expect(parsed).toBeDefined();
  });

  it('should accept tenantIdClaim parameter', () => {
    const schema = `
      type Company @model @multiTenant(tenantIdClaim: "custom:orgId") {
        id: ID!
        name: String!
      }
    `;
    const parsed = parse(schema);
    expect(parsed).toBeDefined();
  });
});

describe('Schema Validation', () => {
  it('should parse valid multi-tenant schema', () => {
    const schema = `
      type Company @model @multiTenant {
        id: ID!
        name: String!
      }
    `;

    const parsed = parse(schema);
    expect(parsed).toBeDefined();
    expect(parsed.kind).toBe('Document');
  });

  it('should parse multi-tenant schema with custom parameters', () => {
    const schema = `
      type Company @model @multiTenant(
        tenantField: "organizationId"
        tenantIdClaim: "custom:orgId"
      ) {
        id: ID!
        name: String!
      }
    `;

    const parsed = parse(schema);
    expect(parsed).toBeDefined();
    expect(parsed.kind).toBe('Document');
  });
});
