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
  });
});
