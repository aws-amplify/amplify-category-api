import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  EnumTypeDefinitionNode,
  Kind,
  ListTypeNode,
  NamedTypeNode,
  NonNullTypeNode,
  ObjectTypeDefinitionNode,
  TypeNode,
  TypeSystemDefinitionNode,
} from 'graphql';
import { getBaseType, isScalar } from 'graphql-transformer-common';
import {
  type JSONSchema,
  isDisallowedScalarType,
  supportedScalarTypes,
  convertNamedTypeToJSONSchema,
} from '@aws-amplify/graphql-transformer-core';

/**
 * Generates a JSON Schema from a GraphQL TypeNode.
 * @param {TypeNode} typeNode - The GraphQL TypeNode to convert.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @param {JSONSchema} [schema={ type: '' }] - The initial schema object.
 * @returns {JSONSchema} The generated JSON Schema.
 */
export const generateJSONSchemaFromTypeNode = (
  typeNode: TypeNode,
  ctx: TransformerContextProvider,
  schema: JSONSchema = { type: '' },
): JSONSchema => {
  switch (typeNode.kind) {
    case Kind.NAMED_TYPE:
      return handleNamedType(typeNode, ctx, schema);
    case Kind.NON_NULL_TYPE:
      return handleNonNullType(typeNode, ctx, schema);
    case Kind.LIST_TYPE:
      return handleListType(typeNode, ctx);
  }
};

/**
 * Handles the conversion of a NamedTypeNode to JSON Schema.
 * @param {NamedTypeNode} typeNode - The NamedTypeNode to process.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @param {JSONSchema} schema - The current schema object.
 * @returns {JSONSchema} The updated JSON Schema.
 */
const handleNamedType = (typeNode: NamedTypeNode, ctx: TransformerContextProvider, schema: JSONSchema): JSONSchema => {
  const namedTypeSchema = convertNamedTypeToJSONSchema(typeNode);
  Object.assign(schema, namedTypeSchema);

  if (isScalar(typeNode)) {
    return schema;
  }

  const baseTypeName = getBaseType(typeNode);
  const typeDef = ctx.output.getType(baseTypeName);
  if (!typeDef) {
    throw new Error(`Type ${baseTypeName} not found`);
  }

  schema.properties = generateJSONSchemaForDef(typeDef, ctx, schema);
  return schema;
};

/**
 * Handles the conversion of a NonNullTypeNode to JSON Schema.
 * @param {NonNullTypeNode} typeNode - The NonNullTypeNode to process.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @param {JSONSchema} schema - The current schema object.
 * @returns {JSONSchema} The updated JSON Schema.
 * @throws {Error} If the field type is disallowed for required fields without a default value.
 */
const handleNonNullType = (typeNode: NonNullTypeNode, ctx: TransformerContextProvider, schema: JSONSchema): JSONSchema => {
  const baseType = getBaseType(typeNode);
  if (isDisallowedScalarType(baseType)) {
    throw new Error(`
      Disallowed required field type ${baseType} without a default value.
      Use one of the supported scalar types for generation routes: [${supportedScalarTypes.join(', ')}]
    `);
  }
  return generateJSONSchemaFromTypeNode(typeNode.type, ctx, schema);
};

/**
 * Handles the conversion of a ListTypeNode to JSON Schema.
 * @param {ListTypeNode} typeNode - The ListTypeNode to process.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @returns {JSONSchema} The JSON Schema representing the list type.
 */
const handleListType = (typeNode: ListTypeNode, ctx: TransformerContextProvider): JSONSchema => {
  return {
    type: 'array',
    items: generateJSONSchemaFromTypeNode(typeNode.type, ctx),
  };
};

/**
 * Generates JSON Schema for a GraphQL type definition.
 * @param {TypeSystemDefinitionNode} def - The GraphQL type definition node.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @param {JSONSchema} schema - The current schema object.
 * @returns {Record<string, JSONSchema>} A record of field names to their JSON Schema representations.
 * @throws {Error} If an unsupported type definition is encountered.
 */
const generateJSONSchemaForDef = (
  def: TypeSystemDefinitionNode,
  ctx: TransformerContextProvider,
  schema: JSONSchema,
): Record<string, JSONSchema> => {
  switch (def.kind) {
    case 'ObjectTypeDefinition':
      return handleObjectTypeDefinition(def, ctx, schema);
    case 'EnumTypeDefinition':
      return handleEnumTypeDefinition(def);
    default:
      throw new Error(`Unsupported type definition: ${def.kind}`);
  }
};

/**
 * Handles the conversion of an ObjectTypeDefinition to JSON Schema.
 * @param {ObjectTypeDefinitionNode} def - The ObjectTypeDefinition node to process.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @param {JSONSchema} schema - The current schema object.
 * @returns {Record<string, JSONSchema>} A record of field names to their JSON Schema representations.
 * @throws {Error} If the object type has no fields.
 */
const handleObjectTypeDefinition = (
  def: ObjectTypeDefinitionNode,
  ctx: TransformerContextProvider,
  schema: JSONSchema,
): Record<string, JSONSchema> => {
  const properties = (def.fields ?? []).reduce((acc: Record<string, JSONSchema>, field) => {
    acc[field.name.value] = generateJSONSchemaFromTypeNode(field.type, ctx, { type: '' });

    // Add required fields to the schema
    if (field.type.kind === Kind.NON_NULL_TYPE) {
      schema.required = [...(schema.required || []), field.name.value];
    }

    return acc;
  }, {});

  return properties;
};

/**
 * Handles the conversion of an EnumTypeDefinition to JSON Schema.
 * @param {EnumTypeDefinitionNode} def - The EnumTypeDefinition node to process.
 * @returns {Record<string, JSONSchema>} A record containing the enum name and its JSON Schema representation.
 */
const handleEnumTypeDefinition = (def: EnumTypeDefinitionNode): Record<string, JSONSchema> => {
  return {
    [def.name.value]: {
      type: 'string',
      enum: def.values?.map((value) => value.name.value),
    },
  };
};
