import { Kind, ObjectTypeDefinitionNode, parse } from 'graphql';

export const MODEL_DIRECTIVE_NAME = 'model';

/**
 * Get the type names with model directives in the GraphQL schema in SDL
 * @param schema graphql schema in SDL
 * @returns type names which model diretives are attached
 */
export const getModelTypeNames = (schema: string): string[] => {
  const parsedDocument = parse(schema);
  const nodesWithModelDirective = parsedDocument.definitions.filter(
    (def) =>
      def.kind === Kind.OBJECT_TYPE_DEFINITION &&
      def.directives &&
      def.directives.find((dir) => dir.name.value === MODEL_DIRECTIVE_NAME) != undefined,
  ) as ObjectTypeDefinitionNode[];
  return nodesWithModelDirective.map((node) => node.name.value);
};
