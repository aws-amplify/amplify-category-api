import { DefinitionNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, Kind, ObjectTypeDefinitionNode } from 'graphql';

const SQL_DIRECTIVE_NAME = 'sql';

export const isObjectTypeDefinitionNode = (obj: DefinitionNode): obj is ObjectTypeDefinitionNode => {
  return obj.kind === Kind.OBJECT_TYPE_DEFINITION || obj.kind === Kind.INTERFACE_TYPE_DEFINITION;
};

export const isQueryNode = (
  obj: DefinitionNode,
): obj is ObjectTypeDefinitionNode | (InterfaceTypeDefinitionNode & { name: { value: 'Query' } }) => {
  return isObjectTypeDefinitionNode(obj) && obj.name.value === 'Query';
};

export const isMutationNode = (
  obj: DefinitionNode,
): obj is ObjectTypeDefinitionNode | (InterfaceTypeDefinitionNode & { name: { value: 'Mutation' } }) => {
  return isObjectTypeDefinitionNode(obj) && obj.name.value === 'Mutation';
};

export const fieldsWithSqlDirective = (obj: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode): FieldDefinitionNode[] => {
  return obj.fields?.filter((field) => field.directives?.some((directive) => directive.name.value === SQL_DIRECTIVE_NAME)) ?? [];
};
