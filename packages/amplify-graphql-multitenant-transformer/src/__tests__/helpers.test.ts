import { parse, ObjectTypeDefinitionNode } from 'graphql';
import {
  hasModelDirective,
  hasMultiTenantDirective,
  getMultiTenantDirective,
  generateTenantIndexName,
  hasTenantField,
  generateVTL,
} from '../utils/helpers';
import { DEFAULT_TENANT_FIELD } from '../utils/constants';

describe('Helper Functions', () => {
  describe('hasModelDirective', () => {
    it('should return true for type with @model directive', () => {
      const schema = parse(`
        type Company @model {
          id: ID!
          name: String!
        }
      `);

      const typeDef = schema.definitions[0] as ObjectTypeDefinitionNode;
      expect(hasModelDirective(typeDef)).toBe(true);
    });

    it('should return false for type without @model directive', () => {
      const schema = parse(`
        type Company {
          id: ID!
          name: String!
        }
      `);

      const typeDef = schema.definitions[0] as ObjectTypeDefinitionNode;
      expect(hasModelDirective(typeDef)).toBe(false);
    });
  });

  describe('hasMultiTenantDirective', () => {
    it('should return true for type with @multiTenant directive', () => {
      const schema = parse(`
        type Company @model @multiTenant {
          id: ID!
          name: String!
        }
      `);

      const typeDef = schema.definitions[0] as ObjectTypeDefinitionNode;
      expect(hasMultiTenantDirective(typeDef)).toBe(true);
    });

    it('should return false for type without @multiTenant directive', () => {
      const schema = parse(`
        type Company @model {
          id: ID!
          name: String!
        }
      `);

      const typeDef = schema.definitions[0] as ObjectTypeDefinitionNode;
      expect(hasMultiTenantDirective(typeDef)).toBe(false);
    });
  });

  describe('getMultiTenantDirective', () => {
    it('should return directive node when present', () => {
      const schema = parse(`
        type Company @model @multiTenant {
          id: ID!
          name: String!
        }
      `);

      const typeDef = schema.definitions[0] as ObjectTypeDefinitionNode;
      const directive = getMultiTenantDirective(typeDef);
      
      expect(directive).toBeDefined();
      expect(directive?.name.value).toBe('multiTenant');
    });

    it('should return undefined when directive not present', () => {
      const schema = parse(`
        type Company @model {
          id: ID!
          name: String!
        }
      `);

      const typeDef = schema.definitions[0] as ObjectTypeDefinitionNode;
      expect(getMultiTenantDirective(typeDef)).toBeUndefined();
    });
  });

  describe('generateTenantIndexName', () => {
    it('should generate default index name', () => {
      const indexName = generateTenantIndexName('Company');
      expect(indexName).toBe('byTenant');
    });

    it('should generate index name with custom tenant field', () => {
      const indexName = generateTenantIndexName('Company', 'organizationId');
      expect(indexName).toBe('byTenant');
    });
  });

  describe('hasTenantField', () => {
    it('should return true when tenant field exists', () => {
      const schema = parse(`
        type Company @model {
          id: ID!
          name: String!
          tenantId: String!
        }
      `);

      const typeDef = schema.definitions[0] as ObjectTypeDefinitionNode;
      expect(hasTenantField(typeDef)).toBe(true);
    });

    it('should return false when tenant field does not exist', () => {
      const schema = parse(`
        type Company @model {
          id: ID!
          name: String!
        }
      `);

      const typeDef = schema.definitions[0] as ObjectTypeDefinitionNode;
      expect(hasTenantField(typeDef)).toBe(false);
    });

    it('should work with custom tenant field name', () => {
      const schema = parse(`
        type Company @model {
          id: ID!
          name: String!
          organizationId: String!
        }
      `);

      const typeDef = schema.definitions[0] as ObjectTypeDefinitionNode;
      expect(hasTenantField(typeDef, 'organizationId')).toBe(true);
      expect(hasTenantField(typeDef, 'tenantId')).toBe(false);
    });
  });

  describe('generateVTL', () => {
    it('should replace template variables', () => {
      const template = 'Hello {{name}}, you are {{age}} years old';
      const variables = { name: 'John', age: '30' };
      
      const result = generateVTL(template, variables);
      expect(result).toBe('Hello John, you are 30 years old');
    });

    it('should handle multiple occurrences of same variable', () => {
      const template = '{{name}} is {{name}}';
      const variables = { name: 'Alice' };
      
      const result = generateVTL(template, variables);
      expect(result).toBe('Alice is Alice');
    });

    it('should leave unreplaced variables unchanged', () => {
      const template = 'Hello {{name}}, {{greeting}}';
      const variables = { name: 'Bob' };
      
      const result = generateVTL(template, variables);
      expect(result).toBe('Hello Bob, {{greeting}}');
    });
  });
});
