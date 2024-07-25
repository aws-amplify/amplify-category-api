import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { TransformerContextOutputProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Kind, NameNode, ObjectTypeDefinitionNode } from 'graphql';
import { getPartitionKeyField, getSortKeyFields } from '../schema';

/**
 * Utility to create a partial of a given type for mocking purposes. Getting the right fields in place is on you.
 * @param mockFields the fields to pass into your mock, optional.
 * @returns a typed object with the input type, and the provided (or no) fields
 */
const createPartialMock = <T>(mockFields?: Partial<T>): T => (mockFields || {}) as unknown as T;

describe('get key field helpers', () => {
  const OBJECT_NAME = 'objectName';
  const createObjectDefinitionWithName = (objectName: string): ObjectTypeDefinitionNode =>
    createPartialMock<ObjectTypeDefinitionNode>({
      name: createPartialMock<NameNode>({ value: objectName }),
      fields: [],
    });
  const MOCK_CONTEXT = createPartialMock<TransformerContextProvider>({
    output: createPartialMock<TransformerContextOutputProvider>({
      getType: jest.fn((name: string) => {
        if (name === OBJECT_NAME) {
          return {
            kind: Kind.SCHEMA_DEFINITION,
            operationTypes: [],
            fields: [],
          };
        }
        return undefined;
      }),
    }),
  });

  describe('getPartitionKeyField', () => {
    it('looks up the type by the object definition name', () => {
      expect(getPartitionKeyField(MOCK_CONTEXT, createObjectDefinitionWithName(OBJECT_NAME))).toBeDefined();
    });

    it('throws when the output type is not defined on the context', () => {
      expect(() => getPartitionKeyField(MOCK_CONTEXT, createObjectDefinitionWithName('unexpectedName'))).toThrowErrorMatchingInlineSnapshot(
        '"Expected to find output object defined for unexpectedName, but did not."',
      );
    });
  });

  describe('getSortKeyFields', () => {
    it('looks up the type by the object definition name', () => {
      expect(getSortKeyFields(MOCK_CONTEXT, createObjectDefinitionWithName(OBJECT_NAME))).toBeDefined();
    });

    it('throws when the output type is not defined on the context', () => {
      expect(() => getSortKeyFields(MOCK_CONTEXT, createObjectDefinitionWithName('unexpectedName'))).toThrowErrorMatchingInlineSnapshot(
        '"Expected to find output object defined for unexpectedName, but did not."',
      );
    });
  });
});
