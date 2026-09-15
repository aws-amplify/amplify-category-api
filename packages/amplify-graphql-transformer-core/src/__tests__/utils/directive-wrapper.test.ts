import { DirectiveNode, ObjectTypeDefinitionNode, parse } from 'graphql';
import { cloneDeep } from 'lodash';
import { getFieldNameFor } from '../../utils/operation-names';
import { DirectiveWrapper } from '../../utils';
import { needsDeepMerge } from '../../utils/directive-wrapper';

describe('Transformer Core Util Tests', () => {
  describe(': Directive Wrapper tests', () => {
    const schema = `
    type Todo @model(subscriptions: {level: public}) {
      id: ID!
      name: String!
    }
    `;
    const typeName = 'Todo';
    const defaultArgs = {
      queries: {
        get: getFieldNameFor('get', typeName),
        list: getFieldNameFor('list', typeName),
      },
      mutations: {
        create: getFieldNameFor('create', typeName),
        update: getFieldNameFor('update', typeName),
        delete: getFieldNameFor('delete', typeName),
      },
      subscriptions: {
        level: 'on',
        onCreate: [getFieldNameFor('onCreate', typeName)],
        onDelete: [getFieldNameFor('onDelete', typeName)],
        onUpdate: [getFieldNameFor('onUpdate', typeName)],
      },
      timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    };
    it(': Should shallow merge with deep merge flag disabled', () => {
      const parsedDoc = parse(schema);
      const objNode = parsedDoc?.definitions?.[0] as ObjectTypeDefinitionNode;
      const modelDir = objNode?.directives?.[0] as DirectiveNode;
      const wrappedDir = new DirectiveWrapper(modelDir);

      const newArgs = wrappedDir.getArguments(cloneDeep(defaultArgs), { deepMergeArguments: false });
      expect(newArgs.subscriptions).toEqual({ level: 'public' });
      expect(newArgs.timestamps).toEqual(defaultArgs.timestamps);
      expect(newArgs.queries).toEqual(defaultArgs.queries);
      expect(newArgs.mutations).toEqual(defaultArgs.mutations);
    });

    it(': Should deep merge with deep merge flag enabled', () => {
      const parsedDoc = parse(schema);
      const objNode = parsedDoc?.definitions?.[0] as ObjectTypeDefinitionNode;
      const modelDir = objNode?.directives?.[0] as DirectiveNode;
      const wrappedDir = new DirectiveWrapper(modelDir);

      const newArgs = wrappedDir.getArguments(cloneDeep(defaultArgs), { deepMergeArguments: true });
      expect(newArgs.subscriptions).toEqual({
        level: 'public',
        onCreate: [getFieldNameFor('onCreate', typeName)],
        onDelete: [getFieldNameFor('onDelete', typeName)],
        onUpdate: [getFieldNameFor('onUpdate', typeName)],
      });
      expect(newArgs.timestamps).toEqual(defaultArgs.timestamps);
      expect(newArgs.queries).toEqual(defaultArgs.queries);
      expect(newArgs.mutations).toEqual(defaultArgs.mutations);
    });

    it('should skip deep clone when there are no user provided arguments', () => {
      const defaultArgs = {
        subscriptions: {
          level: 'on',
          onCreate: [getFieldNameFor('onCreate', typeName)],
          onDelete: [getFieldNameFor('onDelete', typeName)],
          onUpdate: [getFieldNameFor('onUpdate', typeName)],
        },
      };
      const userArgs = {};

      expect(needsDeepMerge(defaultArgs, userArgs)).toEqual(false);
    });

    it('should skip deep clone when there are no common properties between default and user provided arguments', () => {
      const defaultArgs = {
        subscriptions: {
          level: 'on',
          onCreate: [getFieldNameFor('onCreate', typeName)],
          onDelete: [getFieldNameFor('onDelete', typeName)],
          onUpdate: [getFieldNameFor('onUpdate', typeName)],
        },
      };
      const userArgs = {
        queries: {
          get: getFieldNameFor('get', typeName),
          list: getFieldNameFor('list', typeName),
        },
      };

      expect(needsDeepMerge(defaultArgs, userArgs)).toEqual(false);
    });

    it('should allow deep clone when there are common properties between default and user args', () => {
      const defaultArgs = {
        subscriptions: {
          level: 'on',
          onCreate: [getFieldNameFor('onCreate', typeName)],
          onDelete: [getFieldNameFor('onDelete', typeName)],
          onUpdate: [getFieldNameFor('onUpdate', typeName)],
        },
      };
      const userArgs = {
        queries: {
          get: getFieldNameFor('get', typeName),
          list: getFieldNameFor('list', typeName),
        },
        subscriptions: {
          level: 'public',
        },
      };

      expect(needsDeepMerge(defaultArgs, userArgs)).toEqual(true);
    });

    it('should respect query name overrides', () => {
      const schema = `
        type Todo @model(queries: { get: "queryFor" }) {
          name: String!
          description: String
        }
      `;
      const parsedDoc = parse(schema);
      const objNode = parsedDoc?.definitions?.[0] as ObjectTypeDefinitionNode;
      const modelDir = objNode?.directives?.[0] as DirectiveNode;
      const wrappedDir = new DirectiveWrapper(modelDir);

      const newArgs = wrappedDir.getArguments(cloneDeep(defaultArgs), { deepMergeArguments: true });
      expect(newArgs.subscriptions).toEqual(defaultArgs.subscriptions);
      expect(newArgs.timestamps).toEqual(defaultArgs.timestamps);
      expect(newArgs.mutations).toEqual(defaultArgs.mutations);
      expect(newArgs.queries).not.toEqual(defaultArgs.queries);
      expect(newArgs.queries.get).toEqual('queryFor');
      expect(newArgs.queries.list).toEqual(`list${typeName}s`);
    });

    it('should respect disabled operations', () => {
      const schema = `
        type Todo @model(queries: { get: null }, mutations: null, subscriptions: null) {
          name: String!
          description: String
        }

        type Query {
          getMyTodo(id: ID!): Todo @function(name: "getmytodofunction")
        }
      `;
      const parsedDoc = parse(schema);
      const objNode = parsedDoc?.definitions?.[0] as ObjectTypeDefinitionNode;
      const modelDir = objNode?.directives?.[0] as DirectiveNode;
      const wrappedDir = new DirectiveWrapper(modelDir);

      const newArgs = wrappedDir.getArguments(cloneDeep(defaultArgs), { deepMergeArguments: true });
      expect(newArgs.subscriptions).toBeNull();
      expect(newArgs.timestamps).toEqual(defaultArgs.timestamps);
      expect(newArgs.mutations).toBeNull();
      expect(newArgs.queries).not.toEqual(defaultArgs.queries);
      expect(newArgs.queries.get).toBeNull();
      expect(newArgs.queries.list).toEqual(`list${typeName}s`);
    });

    it('should allow Custom create and update timestamps', () => {
      const schema = `
        type Todo @model(timestamps: { createdAt: "createdOn", updatedAt: "updatedOn" }) {
          name: String!
          description: String
        }
      `;
      const parsedDoc = parse(schema);
      const objNode = parsedDoc?.definitions?.[0] as ObjectTypeDefinitionNode;
      const modelDir = objNode?.directives?.[0] as DirectiveNode;
      const wrappedDir = new DirectiveWrapper(modelDir);

      const newArgs = wrappedDir.getArguments(cloneDeep(defaultArgs), { deepMergeArguments: true });
      expect(newArgs.queries).toEqual(defaultArgs.queries);
      expect(newArgs.mutations).toEqual(defaultArgs.mutations);
      expect(newArgs.subscriptions).toEqual(defaultArgs.subscriptions);
      expect(newArgs.timestamps).not.toEqual(defaultArgs.timestamps);
      expect(newArgs.timestamps.createdAt).toEqual('createdOn');
      expect(newArgs.timestamps.updatedAt).toEqual('updatedOn');
    });

    it(': Should skip location when deep cloning', () => {
      // Cloning token locations is expensive and not useful (they're read only).
      // Some transformers are passing AST nodes to 'getArguments'
      // Assert that we don't clone them.
      const parsedDoc = parse(schema);
      const objNode = parsedDoc?.definitions?.[0] as ObjectTypeDefinitionNode;
      const modelDir = objNode?.directives?.[0] as DirectiveNode;
      const wrappedDir = new DirectiveWrapper(modelDir);

      const argsWithASTNodes = {
        // add some args that are AST nodes.
        objNode,
        modelDir,
        // include common args to trigger deep merging.
        ...cloneDeep(defaultArgs),
      };

      const newArgs = wrappedDir.getArguments(argsWithASTNodes, { deepMergeArguments: true });
      // Assert that args were cloned.
      expect(newArgs.objNode === objNode).toBeFalsy();
      expect(newArgs.modelDir === modelDir).toBeFalsy();
      // Assert that locations were not cloned.
      expect(newArgs.objNode.loc === objNode.loc).toBeTruthy();
      expect(newArgs.modelDir.loc === modelDir.loc).toBeTruthy();
    });
  });
});
