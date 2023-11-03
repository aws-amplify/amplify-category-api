import { Kind, ObjectTypeDefinitionNode, parse } from 'graphql';
import { ModelDataSourceDefinition } from '../types';

const MODEL_DIRECTIVE_NAME = 'model';
/**
 * Get the type names with model directives in the GraphQL schema in SDL
 * @param schema graphql schema in SDL
 * @returns type names which model diretives are attached
 */
export function getModelTypeNames(schema: string): string[] {
  const parsedDocument = parse(schema);
  const nodesWithModelDirective = parsedDocument.definitions.filter(
    (def) =>
      def.kind === Kind.OBJECT_TYPE_DEFINITION &&
      def.directives &&
      def.directives.find((dir) => dir.name.value === MODEL_DIRECTIVE_NAME) != undefined,
  ) as ObjectTypeDefinitionNode[];
  return nodesWithModelDirective.map((node) => node.name.value);
}

export function constructDataSourceDefinitionMap(
  schema: string,
  dataSourceDefinition: ModelDataSourceDefinition,
): Record<string, ModelDataSourceDefinition> {
  const parsedSchema = parse(schema);
  return parsedSchema.definitions
    .filter((obj) => obj.kind === Kind.OBJECT_TYPE_DEFINITION && obj.directives?.some((dir) => dir.name.value === MODEL_DIRECTIVE_NAME))
    .map((type) => (type as ObjectTypeDefinitionNode).name.value)
    .reduce((acc, cur) => ({ ...acc, [cur]: dataSourceDefinition }), {});
}
