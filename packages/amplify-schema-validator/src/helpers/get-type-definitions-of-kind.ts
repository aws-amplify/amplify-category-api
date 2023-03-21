import { DocumentNode, TypeDefinitionNode } from 'graphql';

/**
 * Fetches all type definitions by kind
 *
 * @param schema graphql schema
 * @param kind graphql type defition kind
 * @returns TypeDefinitionNode[]
 */
export const getTypeDefinitionsOfKind = (
  schema: DocumentNode,
  kind: string,
): TypeDefinitionNode[] => {
  const typeDefs = schema.definitions.filter(
    (definition) => definition.kind === kind,
  ) as TypeDefinitionNode[];
  return typeDefs;
};
