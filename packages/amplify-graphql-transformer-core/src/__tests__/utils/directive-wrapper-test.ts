import {
  DirectiveNode,
  ObjectTypeDefinitionNode,
  parse,
} from 'graphql';
import { cloneDeep } from 'lodash';
import { FeatureFlagProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { getFieldNameFor } from '../../utils/operation-names';
import { DirectiveWrapper } from '../../utils';

const generateFeatureFlagWithBooleanOverrides = (overrides: Record<string, boolean>): FeatureFlagProvider => ({
  getBoolean: (name: string, defaultValue?: boolean): boolean => {
    const overrideValue = Object.entries(overrides).find(([overrideName]) => overrideName === name)?.[1];
    return overrideValue ?? defaultValue ?? false;
  },
  getNumber: jest.fn(),
  getObject: jest.fn(),
});

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

      const newArgs = wrappedDir.getArguments(cloneDeep(defaultArgs), generateFeatureFlagWithBooleanOverrides({}));
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

      const newArgs = wrappedDir.getArguments(
        cloneDeep(defaultArgs),
        generateFeatureFlagWithBooleanOverrides({ shouldDeepMergeDirectiveConfigDefaults: true }),
      );
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
  });
});
