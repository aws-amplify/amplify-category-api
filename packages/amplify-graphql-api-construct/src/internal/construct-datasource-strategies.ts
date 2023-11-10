import { Kind, ObjectTypeDefinitionNode, parse } from 'graphql';
import { ModelDataSourceStrategy } from '../model-datasource-strategy';
import { MODEL_DIRECTIVE_NAME } from './model-type-name';

export const constructDataSourceStrategies = (
  schema: string,
  dataSourceStrategy: ModelDataSourceStrategy,
): Record<string, ModelDataSourceStrategy> => {
  const parsedSchema = parse(schema);
  return parsedSchema.definitions
    .filter((obj) => obj.kind === Kind.OBJECT_TYPE_DEFINITION && obj.directives?.some((dir) => dir.name.value === MODEL_DIRECTIVE_NAME))
    .map((type) => (type as ObjectTypeDefinitionNode).name.value)
    .reduce((acc, cur) => ({ ...acc, [cur]: dataSourceStrategy }), {});
};
