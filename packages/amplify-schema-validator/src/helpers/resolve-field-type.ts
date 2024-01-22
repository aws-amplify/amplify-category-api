import { TypeNode } from 'graphql';

/**
 * Gets the type of a field
 *
 * @param type graphql TypeNode
 * @returns true|false
 */
export const isListType = (type: TypeNode): boolean => {
  if (type.kind === 'NonNullType') {
    return isListType(type.type);
  } else if (type.kind === 'ListType') {
    return true;
  } else {
    return false;
  }
};
