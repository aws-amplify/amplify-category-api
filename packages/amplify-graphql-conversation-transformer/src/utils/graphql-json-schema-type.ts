import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  Kind,
  ListTypeNode,
  NamedTypeNode,
  NonNullTypeNode,
  TypeNode,
  TypeSystemDefinitionNode,
} from 'graphql';
import { isScalar, getBaseType } from 'graphql-transformer-common';
import {
  JSONSchema,
  convertNamedTypeToJSONSchema,
  isDisallowedScalarType,
  supportedScalarTypes,
} from '@aws-amplify/graphql-transformer-core';

/**
 * Generates a JSON Schema from a GraphQL TypeNode.
 * @param typeNode - The GraphQL TypeNode to convert.
 * @param ctx - The transformer context provider.
 * @param schema - The initial JSON Schema object (optional).
 * @returns The generated JSON Schema.
 */
export function generateJSONSchemaFromTypeNode(
  typeNode: TypeNode,
  ctx: TransformerContextProvider,
  schema: JSONSchema = { type: '' },
): JSONSchema {
  switch (typeNode.kind) {
    case Kind.NAMED_TYPE:
      return handleNamedType(typeNode, ctx, schema);
    case Kind.NON_NULL_TYPE:
      return handleNonNullType(typeNode, ctx, schema);
    case Kind.LIST_TYPE:
      return handleListType(typeNode, ctx, schema);
  }
}

/**
 * Handles the conversion of a NamedType to JSON Schema.
 * @param typeNode - The NamedType node.
 * @param ctx - The transformer context provider.
 * @param schema - The current JSON Schema object.
 * @returns The updated JSON Schema.
 */
function handleNamedType(typeNode: NamedTypeNode, ctx: TransformerContextProvider, schema: JSONSchema): JSONSchema {
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

  schema.properties = generateJSONSchemaForDefinitionNode(typeDef, schema, ctx);
  return schema;
}

const handleNonNullType = (typeNode: NonNullTypeNode, ctx: TransformerContextProvider, schema: JSONSchema): JSONSchema => {
  const baseType = getBaseType(typeNode);
  if (isDisallowedScalarType(baseType)) {
    throw new Error(`
      Disallowed required field type ${baseType}.
      Use one of the supported scalar types for generation routes: [${supportedScalarTypes.join(', ')}]
    `);
  }
  return generateJSONSchemaFromTypeNode(typeNode.type, ctx, schema);
};

const handleListType = (typeNode: ListTypeNode, ctx: TransformerContextProvider, schema: JSONSchema): JSONSchema => {
  return {
    type: 'array',
    items: generateJSONSchemaFromTypeNode(typeNode.type, ctx, schema),
  };
};

/**
 * Generates JSON Schema properties for a TypeSystemDefinitionNode.
 * @param def - The TypeSystemDefinitionNode to convert.
 * @param schema - The current JSON Schema object.
 * @param ctx - The transformer context provider.
 * @returns A record of JSON Schema properties.
 */
function generateJSONSchemaForDefinitionNode(
  def: TypeSystemDefinitionNode,
  schema: JSONSchema,
  ctx: TransformerContextProvider,
): Record<string, JSONSchema> {
  switch (def.kind) {
    case 'InputObjectTypeDefinition':
      return handleInputObjectDefinition(def, schema, ctx);
    case 'EnumTypeDefinition':
      return handleEnumDefinition(def);
    default:
      throw new Error(`Unsupported type definition: ${def.kind}`);
  }
}

/**
 * Handles the conversion of an InputObjectTypeDefinition to JSON Schema properties.
 * @param def - The InputObjectTypeDefinition node.
 * @param schema - The current JSON Schema object.
 * @param ctx - The transformer context provider.
 * @returns A record of JSON Schema properties.
 */
function handleInputObjectDefinition(
  def: InputObjectTypeDefinitionNode,
  schema: JSONSchema,
  ctx: TransformerContextProvider,
): Record<string, JSONSchema> {
  const properties = def.fields?.reduce((acc: Record<string, JSONSchema>, field) => {
    acc[field.name.value] = generateJSONSchemaFromTypeNode(field.type, ctx, { type: '' });
    if (field.type.kind === Kind.NON_NULL_TYPE) {
      schema.required = [...(schema.required || []), field.name.value];
    }
    return acc;
  }, {});

  if (!properties) {
    throw new Error(`Object type ${def.name.value} has no fields`);
  }

  return properties;
}

/**
 * Handles the conversion of an EnumTypeDefinition to JSON Schema properties.
 * @param def - The EnumTypeDefinition node.
 * @returns A record containing the enum JSON Schema.
 */
function handleEnumDefinition(def: EnumTypeDefinitionNode): Record<string, JSONSchema> {
  return {
    [def.name.value]: {
      type: 'string',
      enum: def.values?.map((value) => value.name.value),
    },
  };
}
