import { parse } from 'graphql';
import {
  getConditionInputName,
  getConnectionName,
  getFilterInputName,
  getPrimaryKeyFieldNodes,
  getPrimaryKeyFields,
  getSubscriptionFilterInputName,
  getType,
} from '../../utils';

describe('model-util', () => {
  describe('getType', () => {
    it('should get a named type', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          content: String
        }
      `;
      const ast = parse(schema);
      const type = getType(ast, 'Post');
      expect(type).toBeDefined();
      expect(type?.name.value).toEqual('Post');
      expect(type?.kind).toEqual('ObjectTypeDefinition');
    });

    it('should return undefined for a missing type', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          content: String
        }
      `;
      const ast = parse(schema);
      const type = getType(ast, 'NOT FOUND');
      expect(type).not.toBeDefined();
    });
  });

  describe('getPrimaryKeyFieldNodes', () => {
    it('should return an implicit ID', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFieldNodes(model);
      expect(result).toHaveLength(1);

      const field = result[0] as any;
      expect(field.kind).toEqual('FieldDefinition');
      expect(field.name.value).toEqual('id');
      expect(field.type.kind).toEqual('NonNullType');
      expect(field.type.type.kind).toEqual('NamedType');
      expect(field.type.type.name.value).toEqual('ID');
    });

    it('should return an explicit ID', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          id: ID!
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFieldNodes(model);
      expect(result).toHaveLength(1);

      const field = result[0] as any;
      expect(field.kind).toEqual('FieldDefinition');
      expect(field.name.value).toEqual('id');
      expect(field.type.kind).toEqual('NonNullType');
      expect(field.type.type.kind).toEqual('NamedType');
      expect(field.type.type.name.value).toEqual('ID');
    });

    it('should return an explicit ID with primaryKey directive on a field named ID', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          id: ID! @primaryKey
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFieldNodes(model);
      expect(result).toHaveLength(1);

      const field = result[0] as any;
      expect(field.kind).toEqual('FieldDefinition');
      expect(field.name.value).toEqual('id');
      expect(field.type.kind).toEqual('NonNullType');
      expect(field.type.type.kind).toEqual('NamedType');
      expect(field.type.type.name.value).toEqual('ID');
    });

    it('should return an explicit ID with primaryKey directive on a field named other than ID', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          myId: ID! @primaryKey
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFieldNodes(model);
      expect(result).toHaveLength(1);

      const field = result[0] as any;
      expect(field.kind).toEqual('FieldDefinition');
      expect(field.name.value).toEqual('myId');
      expect(field.type.kind).toEqual('NonNullType');
      expect(field.type.type.kind).toEqual('NamedType');
      expect(field.type.type.name.value).toEqual('ID');
    });

    it('should return a composite primary key', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          myId: ID! @primaryKey(sortKeyFields: ["sk"])
          sk: Int
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFieldNodes(model);
      expect(result).toHaveLength(2);

      const pk = result[0] as any;
      expect(pk.kind).toEqual('FieldDefinition');
      expect(pk.name.value).toEqual('myId');
      expect(pk.type.kind).toEqual('NonNullType');
      expect(pk.type.type.kind).toEqual('NamedType');
      expect(pk.type.type.name.value).toEqual('ID');

      const sk = result[1] as any;
      expect(sk.kind).toEqual('FieldDefinition');
      expect(sk.name.value).toEqual('sk');
      expect(sk.type.kind).toEqual('NamedType');
      expect(sk.type.name.value).toEqual('Int');
    });

    it('should return a multiple sort keys in order', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          myId: ID! @primaryKey(sortKeyFields: ["sk1", "sk2"])
          sk1: Int!
          sk2: String
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFieldNodes(model);
      expect(result).toHaveLength(3);

      const pk = result[0] as any;
      expect(pk.kind).toEqual('FieldDefinition');
      expect(pk.name.value).toEqual('myId');
      expect(pk.type.kind).toEqual('NonNullType');
      expect(pk.type.type.kind).toEqual('NamedType');
      expect(pk.type.type.name.value).toEqual('ID');

      const sk1 = result[1] as any;
      expect(sk1.kind).toEqual('FieldDefinition');
      expect(sk1.name.value).toEqual('sk1');
      expect(sk1.type.kind).toEqual('NonNullType');
      expect(sk1.type.type.kind).toEqual('NamedType');
      expect(sk1.type.type.name.value).toEqual('Int');

      const sk2 = result[2] as any;
      expect(sk2.kind).toEqual('FieldDefinition');
      expect(sk2.name.value).toEqual('sk2');
      expect(sk2.type.kind).toEqual('NamedType');
      expect(sk2.type.name.value).toEqual('String');
    });

    it('should throw if sort key is not found', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          myId: ID! @primaryKey(sortKeyFields: ["notFound"])
          sk: Int
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      expect(() => getPrimaryKeyFieldNodes(model)).toThrow('Invalid sort key field name in primary key directive: notFound');
    });
  });

  describe('getPrimaryKeyFields', () => {
    it('should return an implicit ID', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFields(model);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual('id');
    });

    it('should return an explicit ID', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          id: ID!
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFields(model);
      expect(result).toHaveLength(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual('id');
    });

    it('should return an explicit ID with primaryKey directive on a field named ID', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          id: ID! @primaryKey
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFields(model);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual('id');
    });

    it('should return an explicit ID with primaryKey directive on a field named other than ID', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          myId: ID! @primaryKey
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFields(model);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual('myId');
    });

    it('should return a composite primary key', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          myId: ID! @primaryKey(sortKeyFields: ["sk"])
          sk: Int
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFields(model);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual('myId');
      expect(result[1]).toEqual('sk');
    });

    it('should return a multiple sort keys in order', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          myId: ID! @primaryKey(sortKeyFields: ["sk1", "sk2"])
          sk1: Int!
          sk2: String
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      const result = getPrimaryKeyFields(model);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual('myId');
      expect(result[1]).toEqual('sk1');
      expect(result[2]).toEqual('sk2');
    });

    it('should throw if sort key is not found', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          myId: ID! @primaryKey(sortKeyFields: ["notFound"])
          sk: Int
          content: String
        }
      `;
      const ast = parse(schema);
      const model = getType(ast, 'Post')!;
      expect(() => getPrimaryKeyFields(model)).toThrow('Invalid sort key field name in primary key directive: notFound');
    });
  });

  describe('naming utilities', () => {
    it('getFilterInputName should return a filter input name', () => {
      const modelName = 'Post';
      const result = getFilterInputName(modelName);
      expect(result).toEqual('ModelPostFilterInput');
    });

    it('getConditionInputName should return a filter input name', () => {
      const modelName = 'Post';
      const result = getConditionInputName(modelName);
      expect(result).toEqual('ModelPostConditionInput');
    });

    it('getSubscriptionFilterInputName should return a filter input name', () => {
      const modelName = 'Post';
      const result = getSubscriptionFilterInputName(modelName);
      expect(result).toEqual('ModelSubscriptionPostFilterInput');
    });

    it('getConnectionName should return a filter input name', () => {
      const modelName = 'Post';
      const result = getConnectionName(modelName);
      expect(result).toEqual('ModelPostConnection');
    });
  });
});
