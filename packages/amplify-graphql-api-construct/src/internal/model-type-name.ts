import { Kind, ObjectTypeDefinitionNode, StringValueNode, parse } from 'graphql';
import { ModelDataSourceStrategy } from '../model-datasource-strategy-types';

const MODEL_DIRECTIVE_NAME = 'model';
const MANY_TO_MANY_DIRECTIVE_NAME = 'manyToMany';

/**
 * Get the type names with model directives in the GraphQL schema in SDL
 * @param schema graphql schema in SDL
 * @returns type names which model diretives are attached
 */
export const getModelTypeNames = (schema: string): string[] => {
  const parsedSchema = parse(schema);
  const nodesWithModelDirective = parsedSchema.definitions.filter(
    (obj) => obj.kind === Kind.OBJECT_TYPE_DEFINITION && obj.directives?.some((dir) => dir.name.value === MODEL_DIRECTIVE_NAME),
  );
  const modelKeys = nodesWithModelDirective.map((type) => (type as ObjectTypeDefinitionNode).name.value);
  nodesWithModelDirective.forEach((obj) => {
    const { fields } = obj as ObjectTypeDefinitionNode;
    fields?.forEach((field) => {
      field.directives?.forEach((dir) => {
        if (dir.name.value === MANY_TO_MANY_DIRECTIVE_NAME) {
          const relationArg = dir.arguments?.find((arg) => arg.name.value === 'relationName');
          if (relationArg) {
            modelKeys.push((relationArg.value as StringValueNode).value);
          }
        }
      });
    });
  });
  return modelKeys.filter((key, idx) => modelKeys.indexOf(key) === idx);
};

export const constructDataSourceStrategies = (
  schema: string,
  dataSourceStrategy: ModelDataSourceStrategy,
): Record<string, ModelDataSourceStrategy> => {
  const modelKeys = getModelTypeNames(schema);
  return modelKeys.reduce((acc, cur) => ({ ...acc, [cur]: dataSourceStrategy }), {});
};
