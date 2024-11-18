import { JSONSchema } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { InputObjectTypeDefinitionNode, InputValueDefinitionNode, TypeNode } from 'graphql';
import { getBaseType, isNonNullType, isScalar } from 'graphql-transformer-common';

export const generateJSONSchemaFromTypeNode = (
  inputValueDefinition: InputValueDefinitionNode,
  ctx: TransformerContextProvider,
): JSONSchema | undefined => {
  const { type, name } = inputValueDefinition;
  const baseType = getBaseType(type);

  // Handle scalar types
  if (isScalar(type)) {
    return generateScalarSchema(baseType);
  }

  // Handle input types
  const inputType = ctx.output.getType(baseType) as InputObjectTypeDefinitionNode;
  if (inputType) {
    return generateInputObjectSchema(inputType, ctx, baseType, name.value);
  }

  return undefined;
};

const generateFieldSchema = (field: InputValueDefinitionNode): JSONSchema | undefined => {
  const baseType = getBaseType(field.type);
  // Handle array types
  if (field.type.kind === 'ListType') {
    return {
      type: 'array',
      items: isScalar(field.type) ? generateScalarSchema(baseType) : { $ref: `#/$defs/${baseType}` },
    };
  }

  // Handle scalar types
  if (isScalar(field.type)) {
    return generateScalarSchema(baseType);
  }

  // Handle reference to other input types
  return { $ref: `#/$defs/${baseType}` };
};

const collectInputTypeDefinitions = (
  typeName: string,
  ctx: TransformerContextProvider,
  definitions: Record<string, JSONSchema>,
  visited: Set<string>,
): void => {
  if (visited.has(typeName)) return;
  visited.add(typeName);

  const type = ctx.output.getType(typeName);
  if (!type) return;

  // Handle enum types
  if (type.kind === 'EnumTypeDefinition') {
    definitions[typeName] = {
      type: 'string',
      enum: type.values?.map((value) => value.name.value) || [],
    };
    return;
  }

  // Handle input object types
  if (type.kind === 'InputObjectTypeDefinition') {
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];

    type.fields?.forEach((field) => {
      const fieldBaseType = getBaseType(field.type);
      const fieldType = ctx.output.getType(fieldBaseType);

      // Recursively collect definitions for nested types
      if (fieldType) {
        collectInputTypeDefinitions(fieldBaseType, ctx, definitions, visited);
      }

      const fieldSchema = generateFieldSchema(field);
      if (fieldSchema) {
        properties[field.name.value] = fieldSchema;
        if (isNonNullType(field.type)) {
          required.push(field.name.value);
        }
      }
    });

    definitions[typeName] = {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
    };
  }
};

const generateInputObjectSchema = (
  inputType: InputObjectTypeDefinitionNode,
  ctx: TransformerContextProvider,
  typeName: string,
  fieldName: string,
): JSONSchema => {
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];
  const $defs: Record<string, JSONSchema> = {};

  // Collect all input type definitions
  collectInputTypeDefinitions(typeName, ctx, $defs, new Set());

  // Generate properties for the current input type
  if ($defs[inputType.name.value]) {
    properties[fieldName] = { $ref: `#/$defs/${inputType.name.value}` };
  } else {
    inputType.fields?.forEach((field) => {
      const fieldSchema = generateFieldSchema(field);
      if (fieldSchema) {
        properties[field.name.value] = fieldSchema;
        if (isNonNullType(field.type)) {
          required.push(field.name.value);
        }
      }
    });
  }

  return {
    type: 'object',
    $defs,
    properties,
    ...(required.length > 0 && { required }),
  };
};

const generateScalarSchema = (scalarType: string): JSONSchema => {
  switch (scalarType) {
    case 'Int':
      return { type: 'integer' };
    case 'Float':
      return { type: 'number' };
    case 'Boolean':
      return { type: 'boolean' };
    case 'ID':
    case 'String':
    default:
      return { type: 'string' };
  }
};
