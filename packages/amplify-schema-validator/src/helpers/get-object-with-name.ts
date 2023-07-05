import { DocumentNode, Kind, ObjectTypeDefinitionNode } from 'graphql';

/**
 * Finds a graphql object definition by name
 *
 * @param schema graphql schema
 * @param name name of object being searched for
 * @returns ObjectTypeDefinitionNode
 */
export const getObjectWithName = (schema: DocumentNode, name: string): ObjectTypeDefinitionNode | undefined => {
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  return objectTypeDefinitions.find((objectTypeDefinition) => objectTypeDefinition.name.value === name);
};
