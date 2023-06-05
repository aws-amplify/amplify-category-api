import { InputObjectTypeDefinitionNode } from 'graphql';
import { makeInputValueDefinition, makeNonNullType, makeNamedType } from 'graphql-transformer-common';

/**
 *
 * @param input
 * @param connectionFieldName
 * @param nonNull
 */
export function updateInputWithConnectionField(
  input: InputObjectTypeDefinitionNode,
  connectionFieldName: string,
  nonNull = false,
): InputObjectTypeDefinitionNode {
  const keyFieldExists = Boolean(input.fields.find((f) => f.name.value === connectionFieldName));
  // If the key field already exists then do not change the input.
  // The @connection field will validate that the key field is valid.
  if (keyFieldExists) {
    return input;
  }
  const updatedFields = [
    ...input.fields,
    makeInputValueDefinition(connectionFieldName, nonNull ? makeNonNullType(makeNamedType('ID')) : makeNamedType('ID')),
  ];
  return {
    ...input,
    fields: updatedFields,
  };
}
