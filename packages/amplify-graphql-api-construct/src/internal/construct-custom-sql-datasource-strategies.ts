import { DefinitionNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, Kind, ObjectTypeDefinitionNode, parse } from 'graphql';
import { isSqlStrategy } from 'graphql-transformer-common';
import { CustomSqlDataSourceStrategy, ModelDataSourceStrategy } from '../model-datasource-strategy';

export const SQL_DIRECTIVE_NAME = 'sql';

const fieldsWithSqlDirective = (obj: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode): FieldDefinitionNode[] => {
  return obj.fields?.filter((field) => field.directives?.some((directive) => directive.name.value === SQL_DIRECTIVE_NAME)) ?? [];
};

const isObjectTypeDefinitionNode = (obj: DefinitionNode): obj is ObjectTypeDefinitionNode => {
  return obj.kind === Kind.OBJECT_TYPE_DEFINITION || obj.kind === Kind.INTERFACE_TYPE_DEFINITION;
};

const isQueryNode = (
  obj: DefinitionNode,
): obj is ObjectTypeDefinitionNode | (InterfaceTypeDefinitionNode & { name: { value: 'Query' } }) => {
  return isObjectTypeDefinitionNode(obj) && obj.name.value === 'Query';
};

const isMutationNode = (
  obj: DefinitionNode,
): obj is ObjectTypeDefinitionNode | (InterfaceTypeDefinitionNode & { name: { value: 'Mutation' } }) => {
  return isObjectTypeDefinitionNode(obj) && obj.name.value === 'Mutation';
};

export const constructCustomSqlDataSourceStrategies = (
  schema: string,
  dataSourceStrategy: ModelDataSourceStrategy,
): CustomSqlDataSourceStrategy[] => {
  if (!isSqlStrategy(dataSourceStrategy)) {
    return [];
  }

  const parsedSchema = parse(schema);

  const queryNode = parsedSchema.definitions.find(isQueryNode);
  const mutationNode = parsedSchema.definitions.find(isMutationNode);
  if (!queryNode && !mutationNode) {
    return [];
  }

  const customSqlDataSourceStrategies: CustomSqlDataSourceStrategy[] = [];

  if (queryNode) {
    const fields = fieldsWithSqlDirective(queryNode);
    for (const field of fields) {
      customSqlDataSourceStrategies.push({
        typeName: 'Query',
        fieldName: field.name.value,
        strategy: dataSourceStrategy,
      });
    }
  }

  if (mutationNode) {
    const fields = fieldsWithSqlDirective(mutationNode);
    for (const field of fields) {
      customSqlDataSourceStrategies.push({
        typeName: 'Mutation',
        fieldName: field.name.value,
        strategy: dataSourceStrategy,
      });
    }
  }

  return customSqlDataSourceStrategies;
};
