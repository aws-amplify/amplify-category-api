import { Kind, ObjectTypeDefinitionNode, parse } from 'graphql';

/**
 * Get the type names with model directives in the GraphQL schema in SDL
 * @param schema graphql schema in SDL
 * @returns type names which model diretives are attached
 */
export function getModelTypeNames(schema: string): string[] {
  const parsedDocument = parse(schema);
  const nodesWithModelDirective = parsedDocument.definitions.filter(
    (def) =>
      def.kind === Kind.OBJECT_TYPE_DEFINITION && def.directives && def.directives.find((dir) => dir.name.value === 'model') != undefined,
  ) as ObjectTypeDefinitionNode[];
  return nodesWithModelDirective.map((node) => node.name.value);
}
