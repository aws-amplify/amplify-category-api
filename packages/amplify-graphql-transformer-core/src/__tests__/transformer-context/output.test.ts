import { Kind, DocumentNode } from 'graphql';
import { TransformerOutput } from '../../transformer-context/output';
import {
  DEFAULT_SCHEMA_DEFINITION,
  DEFAULT_QUERY_OPERATION,
  DEFAULT_MUTATION_OPERATION,
  DEFAULT_SUBSCRIPTION_OPERATION,
} from '../../utils/defaultSchema';

describe('TransformerOutput', () => {
  test('iterate over each document definition once', () => {
    const inputDocument: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [
        {
          kind: 'ObjectTypeDefinition',
          name: {
            kind: 'Name',
            value: 'Query',
          },
          interfaces: [],
          directives: [],
          fields: [
            {
              kind: 'FieldDefinition',
              name: {
                kind: 'Name',
                value: 'queryA',
              },
              arguments: [],
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: {
                    kind: 'Name',
                    value: 'String',
                  },
                },
              },
              directives: [],
            },
          ],
        },
        {
          kind: 'ObjectTypeExtension',
          name: {
            kind: 'Name',
            value: 'Query',
          },
          interfaces: [],
          directives: [],
          fields: [
            {
              kind: 'FieldDefinition',
              name: {
                kind: 'Name',
                value: 'queryB',
              },
              arguments: [],
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: {
                    kind: 'Name',
                    value: 'String',
                  },
                },
              },
              directives: [],
            },
          ],
        },
        {
          kind: 'ObjectTypeExtension',
          name: {
            kind: 'Name',
            value: 'Query',
          },
          interfaces: [],
          directives: [],
          fields: [
            {
              kind: 'FieldDefinition',
              name: {
                kind: 'Name',
                value: 'queryC',
              },
              arguments: [],
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: {
                    kind: 'Name',
                    value: 'String',
                  },
                },
              },
              directives: [],
            },
          ],
        },
      ],
    };
    expect(() => new TransformerOutput(inputDocument)).not.toThrow();
  });

  describe('add default operations', () => {
    const inputDocumentWithNoOperations: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [
        {
          kind: Kind.SCHEMA_DEFINITION,
          directives: [],
          operationTypes: [],
        },
      ],
    };

    const inputDocumentWithAllOperations: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [DEFAULT_SCHEMA_DEFINITION],
    };

    test('adds default query operation', () => {
      const output = new TransformerOutput(inputDocumentWithNoOperations);
      expect(output.getQueryTypeName()).toBeUndefined();
      output.addDefaultQuery();
      expect(output.getQueryTypeName()).toEqual('Query');
    });

    test('adds default mutation operation', () => {
      const output = new TransformerOutput(inputDocumentWithNoOperations);
      expect(output.getMutationTypeName()).toBeUndefined();
      output.addDefaultMutation();
      expect(output.getMutationTypeName()).toEqual('Mutation');
    });

    test('adds default subscription operation', () => {
      const output = new TransformerOutput(inputDocumentWithNoOperations);
      expect(output.getSubscriptionTypeName()).toBeUndefined();
      output.addDefaultSubscription();
      expect(output.getSubscriptionTypeName()).toEqual('Subscription');
    });

    test('does not overwrite existing query operation', () => {
      const output = new TransformerOutput(inputDocumentWithAllOperations);
      expect(() => output.addDefaultQuery()).toThrowError('Conflicting query operation found.');
    });

    test('does not overwrite existing mutation operation', () => {
      const output = new TransformerOutput(inputDocumentWithAllOperations);
      expect(() => output.addDefaultMutation()).toThrowError('Conflicting mutation operation found.');
    });

    test('does not overwrite existing subscription operation', () => {
      const output = new TransformerOutput(inputDocumentWithAllOperations);
      expect(() => output.addDefaultSubscription()).toThrowError('Conflicting subscription operation found.');
    });

    test('does not remove other operations', () => {
      const inputDocument: DocumentNode = {
        kind: Kind.DOCUMENT,
        definitions: [
          {
            kind: Kind.SCHEMA_DEFINITION,
            directives: [],
            operationTypes: [DEFAULT_QUERY_OPERATION, DEFAULT_MUTATION_OPERATION],
          },
        ],
      };
      const output = new TransformerOutput(inputDocument);
      expect(output.getQueryTypeName()).toEqual('Query');
      expect(output.getMutationTypeName()).toEqual('Mutation');
      expect(output.getSubscriptionTypeName()).toBeUndefined();
      output.addDefaultSubscription();
      expect(output.getQueryTypeName()).toEqual('Query');
      expect(output.getMutationTypeName()).toEqual('Mutation');
      expect(output.getSubscriptionTypeName()).toEqual('Subscription');
    });

    test('adds default query operation when adding fields', () => {
      const output = new TransformerOutput(inputDocumentWithNoOperations);
      expect(output.getQueryTypeName()).toBeUndefined();
      output.addQueryFields([]);
      expect(output.getQueryTypeName()).toEqual('Query');
    });

    test('adds default mutation operation when adding fields', () => {
      const output = new TransformerOutput(inputDocumentWithNoOperations);
      expect(output.getMutationTypeName()).toBeUndefined();
      output.addMutationFields([]);
      expect(output.getMutationTypeName()).toEqual('Mutation');
    });

    test('adds default subscription operation when adding fields', () => {
      const output = new TransformerOutput(inputDocumentWithNoOperations);
      expect(output.getSubscriptionTypeName()).toBeUndefined();
      output.addSubscriptionFields([]);
      expect(output.getSubscriptionTypeName()).toEqual('Subscription');
    });
  });
});
