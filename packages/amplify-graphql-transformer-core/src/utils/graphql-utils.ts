import { DefinitionNode, DocumentNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, Kind, ObjectTypeDefinitionNode } from 'graphql';

const SQL_DIRECTIVE_NAME = 'sql';

export const isObjectTypeDefinitionNode = (obj: DefinitionNode): obj is ObjectTypeDefinitionNode => {
  return obj.kind === Kind.OBJECT_TYPE_DEFINITION || obj.kind === Kind.INTERFACE_TYPE_DEFINITION;
};

export const isMutationType = (typeName: string): typeName is 'Mutation' => typeName === 'Mutation';

export const isQueryType = (typeName: string): typeName is 'Query' => typeName === 'Query';

export const isSubscriptionType = (typeName: string): typeName is 'Subscription' => typeName === 'Subscription';

export const isBuiltInGraphqlType = (typeName: string): typeName is 'Mutation' | 'Query' | 'Subscription' =>
  isMutationType(typeName) || isQueryType(typeName) || isSubscriptionType(typeName);

export const isMutationNode = (
  obj: DefinitionNode,
): obj is (ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) & { name: { value: 'Mutation' } } => {
  return isObjectTypeDefinitionNode(obj) && isMutationType(obj.name.value);
};

export const isQueryNode = (
  obj: DefinitionNode,
): obj is (ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) & { name: { value: 'Query' } } => {
  return isObjectTypeDefinitionNode(obj) && isQueryType(obj.name.value);
};

export const isSubscriptionNode = (
  obj: DefinitionNode,
): obj is (ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) & { name: { value: 'Subscription' } } => {
  return isObjectTypeDefinitionNode(obj) && isSubscriptionType(obj.name.value);
};

export const isBuiltInGraphqlNode = (
  obj: DefinitionNode,
): obj is (ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) & { name: { value: 'Mutation' | 'Query' | 'Subscription' } } => {
  return isMutationNode(obj) || isQueryNode(obj) || isSubscriptionNode(obj);
};

export const fieldsWithSqlDirective = (obj: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode): FieldDefinitionNode[] => {
  return obj.fields?.filter((field) => field.directives?.some((directive) => directive.name.value === SQL_DIRECTIVE_NAME)) ?? [];
};

export const getField = (obj: ObjectTypeDefinitionNode, fieldName: string): FieldDefinitionNode | undefined =>
  obj.fields?.find((f) => f.name.value === fieldName);

export const getType = (schema: DocumentNode, typeName: string): ObjectTypeDefinitionNode | undefined =>
  schema.definitions.find((def) => isObjectTypeDefinitionNode(def) && def.name.value === typeName) as ObjectTypeDefinitionNode | undefined;

/**
 * Returns true if the node has a directive named `name`
 */
export const hasDirectiveWithName = (
  node: FieldDefinitionNode | InterfaceTypeDefinitionNode | ObjectTypeDefinitionNode,
  name: string,
): boolean => {
  return node.directives?.some((d) => d.name.value === name) ?? false;
};
