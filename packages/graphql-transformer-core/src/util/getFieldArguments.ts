import { FieldDefinitionNode } from 'graphql';
import { getBaseType } from 'graphql-transformer-common';
/**
 * Given a Type returns a plain JS map of its arguments
 * @param arguments The list of argument nodes to reduce.
 */
export function getFieldArguments(type: any): any {
  return type.fields
    ? type.fields.reduce(
        (acc: {}, arg: FieldDefinitionNode) => ({
          ...acc,
          [arg.name.value]: getBaseType(arg.type),
        }),
        {},
      )
    : [];
}
