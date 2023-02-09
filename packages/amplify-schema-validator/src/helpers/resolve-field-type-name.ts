import { NamedTypeNode, TypeNode } from 'graphql';

/**
 * Gets the name of of a graphql TypeNode
 *
 * @param type graphql TypeNode
 * @returns string|undefined
 */
export const resolveFieldTypeName = (type: TypeNode | undefined): string | undefined => {
  switch (type?.kind) {
    case 'NamedType': {
      return type.name.value;
    }
    case 'NonNullType':
      if (type.type.kind === 'NamedType') {
        return type.type.name.value;
      } if (type.type.kind === 'ListType') {
        if (type.type.type.kind === 'NamedType') {
          return type.type.type.name.value;
        } if (type.type.type.kind === 'NonNullType') {
          return (type.type.type.type as NamedTypeNode).name.value;
        } return undefined;
      } return undefined;

    case 'ListType': {
      if (type.type.kind === 'NamedType') {
        return type.type.name.value;
      } if (type.type.kind === 'NonNullType') {
        return (type.type.type as NamedTypeNode).name.value;
      } return undefined;
    }
    default: {
      return undefined;
    }
  }
};
