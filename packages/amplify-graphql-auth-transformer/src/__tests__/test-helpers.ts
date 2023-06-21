import { ObjectTypeDefinitionNode, FieldDefinitionNode, DocumentNode, Kind } from 'graphql';

/**
 * Gets a type from Doc Node
 */
export const getObjectType = (
  doc: DocumentNode,
  type: string,
):
  ObjectTypeDefinitionNode
  | undefined => doc.definitions.find((def) => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === type) as
  | ObjectTypeDefinitionNode
  | undefined;

/**
 * Gets a field from a Def Node
 */
export const getField = (
  obj: ObjectTypeDefinitionNode,
  fieldName: string,
): FieldDefinitionNode | void => obj.fields?.find((f) => f.name.value === fieldName);
