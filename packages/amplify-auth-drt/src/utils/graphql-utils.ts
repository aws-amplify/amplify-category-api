import { NameNode, ValueNode, StringValueNode, DirectiveNode, ObjectValueNode, ListValueNode, EnumValueNode } from 'graphql';

export const hasDirectiveNamed = (obj: DirectivesProvider, name: string): boolean =>
  hasDirectives(obj) && obj.directives.some((d) => d.name.value === name);

export const hasName = (obj: any, name: string): boolean => hasNameNode(obj) && obj.name.value === name;

export const hasNameNode = (obj: any): obj is { name: NameNode } => typeof obj === 'object' && isNameNode(obj.name);

export const isEnumValueNode = (obj: any): obj is EnumValueNode => typeof obj === 'object' && obj.kind === 'EnumValue';

export const isListValueNode = (obj: any): obj is ListValueNode => typeof obj === 'object' && obj.kind === 'ObjectValue';

export const isNameNode = (obj: any): obj is NameNode => typeof obj === 'object' && obj.kind === 'Name' && typeof obj.value === 'string';

export const isObjectValueNode = (obj: ValueNode): obj is ObjectValueNode => typeof obj === 'object' && obj.kind === 'ObjectValue';

export const isStringValueNode = (obj: ValueNode): obj is StringValueNode => typeof obj === 'object' && obj.kind === 'StringValue';

export type DirectivesProvider = { directives?: ReadonlyArray<DirectiveNode> };
export const hasDirectives = (obj: DirectivesProvider): obj is { directives: ReadonlyArray<DirectiveNode> } =>
  typeof obj.directives === 'object' && Array.isArray(obj.directives);

export const getDirectivesNamed = (obj: DirectivesProvider, name: string): DirectiveNode[] => {
  if (!hasDirectives(obj)) {
    return [];
  }
  return obj.directives.filter((d) => d.name.value === name);
};
