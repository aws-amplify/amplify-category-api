import { SchemaDefinitionNode, OperationTypeDefinitionNode, Kind } from 'graphql';

export const DEFAULT_QUERY_OPERATION: OperationTypeDefinitionNode = {
  kind: Kind.OPERATION_TYPE_DEFINITION,
  operation: 'query',
  type: {
    kind: Kind.NAMED_TYPE,
    name: {
      kind: Kind.NAME,
      value: 'Query',
    },
  },
};
export const DEFAULT_MUTATION_OPERATION: OperationTypeDefinitionNode = {
  kind: Kind.OPERATION_TYPE_DEFINITION,
  operation: 'mutation',
  type: {
    kind: Kind.NAMED_TYPE,
    name: {
      kind: Kind.NAME,
      value: 'Mutation',
    },
  },
};
export const DEFAULT_SUBSCRIPTION_OPERATION: OperationTypeDefinitionNode = {
  kind: Kind.OPERATION_TYPE_DEFINITION,
  operation: 'subscription',
  type: {
    kind: Kind.NAMED_TYPE,
    name: {
      kind: Kind.NAME,
      value: 'Subscription',
    },
  },
};

export const DEFAULT_SCHEMA_DEFINITION: SchemaDefinitionNode = {
  kind: Kind.SCHEMA_DEFINITION,
  directives: [],
  operationTypes: [DEFAULT_QUERY_OPERATION, DEFAULT_MUTATION_OPERATION, DEFAULT_SUBSCRIPTION_OPERATION],
};
