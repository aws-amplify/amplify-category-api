import { getFieldNameFor, InvalidDirectiveError, JSONSchema } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  FieldDefinitionNode,
  InputValueDefinitionNode,
  ObjectTypeDefinitionNode,
  ObjectValueNode,
  StringValueNode,
  TypeNode,
} from 'graphql';
import { getBaseType, isNonNullType, isScalar, toUpper } from 'graphql-transformer-common';
import pluralize from 'pluralize';
import { CustomQueryTool, ModelOperationTool, ToolDefinition } from '../conversation-directive-configuration';
import { generateJSONSchemaFromTypeNode } from './graphql-json-schema-type';

export type Tool = {
  name: string;
  description: string;
  inputSchema: {
    json: JSONSchema;
  };
  graphqlRequestInputDescriptor?: GraphQLRequestInputDescriptor;
};

export const isModelOperationToolPredicate = (tool: ToolDefinition): tool is ModelOperationTool =>
  tool.modelName !== undefined && tool.modelOperation !== undefined && tool.queryName === undefined;

export const isCustomQueryToolPredicate = (tool: ToolDefinition): tool is CustomQueryTool =>
  tool.queryName !== undefined && tool.modelName === undefined && tool.modelOperation === undefined;

type GraphQLRequestInputDescriptor = {
  selectionSet: string;
  propertyTypes: Record<string, string>;
  queryName: string;
};

/**
 * Processes tool definitions and generates a Tools object.
 *
 * @param {ToolDefinition[]} toolDefinitions - An array of tool definitions.
 * @param {TransformerContextProvider} ctx - The transformer context provider.
 * @returns {Tools | undefined} A Tools object if valid tool definitions are provided, undefined otherwise.
 * @throws {InvalidDirectiveError} If there are no queries or if a tool is defined without a matching Query field.
 */
export const processTools = (toolDefinitions: ToolDefinition[], ctx: TransformerContextProvider): Tool[] | undefined => {
  // Early return if no tool definitions are provided
  if (!toolDefinitions || toolDefinitions.length === 0) {
    return undefined;
  }

  // Retrieve Query type fields
  const queryType = ctx.output.getType('Query') as ObjectTypeDefinitionNode;
  if (!queryType.fields || queryType.fields.length === 0) {
    throw new InvalidDirectiveError('Tools must be queries - no queries found in the schema');
  }

  // Process each tool definition
  const tools: Tool[] = toolDefinitions.map((toolDefinition) => {
    const queryName = isModelOperationToolPredicate(toolDefinition) ? modelListQueryName(toolDefinition, ctx) : toolDefinition.queryName;
    const queryField = queryType.fields?.find((field) => field.name.value === queryName);

    if (!queryField) {
      throw new InvalidDirectiveError(
        `Tool "${toolDefinition.name}" defined in @conversation directive has no matching Query field definition`,
      );
    }

    return createTool({ toolDefinition, queryField, ctx });
  });

  return tools;
};

/**
 * Generates a selection set for a GraphQL query based on the given type.
 * This function recursively traverses the type structure to create a complete selection set.
 *
 * @param {TypeNode} currentType - The current GraphQL type being processed.
 * @param {TransformerContextProvider} ctx - The transformer context provider.
 * @param {Set<string>} [seenTypes=new Set()] - A set to track already processed types and prevent infinite recursion.
 * @param {string} [fieldName=''] - The name of the current field being processed.
 * @returns {string} The generated selection set as a string.
 * @throws {Error} If a type definition cannot be found.
 */
const generateSelectionSet = (
  currentType: TypeNode,
  ctx: TransformerContextProvider,
  seenTypes: Set<string> = new Set(),
  fieldName: string = '',
): string => {
  // Base case: if the current type is a scalar, return the field name
  if (isScalar(currentType)) {
    return fieldName;
  }

  const typeName = getBaseType(currentType);

  // Prevent infinite recursion by checking if we've already seen this type
  if (seenTypes.has(typeName)) {
    return '';
  }

  // Get the object type definition and mark it as seen
  const type = getObjectTypeFromName(typeName, ctx);
  seenTypes.add(type.name.value);

  // If the type has no fields, return an empty string
  if (!type.fields || type.fields.length === 0) {
    return '';
  }

  // Build the selection set for this type
  const fieldSelections = type.fields
    .map((field) => {
      if (isScalar(field.type)) {
        // For scalar fields, just include the field name
        return field.name.value;
      } else {
        // For object types, recursively generate the nested selection
        const nestedSelection = generateSelectionSet(field.type, ctx, new Set(seenTypes), field.name.value);
        return nestedSelection ? `${field.name.value} { ${nestedSelection} }` : '';
      }
    })
    .filter(Boolean); // Remove any empty strings

  return fieldSelections.join(' ');
};

/**
 * Retrieves the ObjectTypeDefinitionNode for a given type name from the context.
 *
 * @param {string} name - The name of the type to retrieve.
 * @param {TransformerContextProvider} ctx - The transformer context provider.
 * @returns {ObjectTypeDefinitionNode} The object type definition node.
 * @throws {Error} If the type definition cannot be found.
 */
const getObjectTypeFromName = (name: string, ctx: TransformerContextProvider): ObjectTypeDefinitionNode => {
  const node = ctx.output.getObject(name);
  if (!node) {
    throw new Error(`Could not find type definition for ${name}`);
  }
  return node;
};

/**
 * Creates a Tool object based on the query field definition.
 *
 * @param {string} toolName - The name of the tool.
 * @param {string} description - The description of the tool.
 * @param {FieldDefinitionNode} queryField - The query field definition.
 * @param {TransformerContextProvider} ctx - The transformer context provider.
 * @returns {Tool} A Tool object.
 */
const createTool = (input: { toolDefinition: ToolDefinition; queryField: FieldDefinitionNode; ctx: TransformerContextProvider }): Tool => {
  const { toolDefinition, queryField, ctx } = input;
  const { name: toolName, description } = toolDefinition;
  const { type: returnType, arguments: fieldArguments } = queryField;

  // Generate tool properties and required fields
  const { properties, required } = generateToolProperties(fieldArguments, ctx, toolDefinition);

  // Generate selection set for the return type
  const selectionSet = generateSelectionSet(returnType, ctx).trim();

  // Generate property types for GraphQL request input
  const propertyTypes = generatePropertyTypes(fieldArguments, toolDefinition);

  // Create GraphQL request input descriptor
  const graphqlRequestInputDescriptor: GraphQLRequestInputDescriptor = {
    selectionSet,
    propertyTypes,
    queryName: queryField.name.value,
  };

  return {
    name: toolName,
    description,
    inputSchema: {
      json: {
        type: 'object',
        properties,
        required,
      },
    },
    graphqlRequestInputDescriptor,
  };
};

/**
 * Generates tool properties and required fields from field arguments.
 *
 * @param {InputValueDefinitionNode[] | undefined} fieldArguments - The field arguments.
 * @param {TransformerContextProvider} ctx - The transformer context provider.
 * @returns {{ properties: Record<string, JSONSchema>, required: string[] }} An object containing properties and required fields.
 */
const generateToolProperties = (
  fieldArguments: readonly InputValueDefinitionNode[] | undefined,
  ctx: TransformerContextProvider,
  toolDefinition: ToolDefinition,
): { properties: Record<string, JSONSchema>; required: string[] } => {
  if (!fieldArguments || fieldArguments.length === 0) {
    return { properties: {}, required: [] };
  }

  if (isModelOperationToolPredicate(toolDefinition)) {
    return { properties: {}, required: [] };
  }

  return fieldArguments.reduce(
    (acc, fieldArgument) => {
      const fieldArgumentSchema = generateJSONSchemaFromTypeNode(fieldArgument.type, ctx);
      acc.properties[fieldArgument.name.value] = fieldArgumentSchema;

      if (fieldArgument.type.kind === 'NonNullType') {
        acc.required.push(fieldArgument.name.value);
      }

      return acc;
    },
    { properties: {}, required: [] } as { properties: Record<string, JSONSchema>; required: string[] },
  );
};

/**
 * Generates property types for GraphQL request input.
 *
 * @param {InputValueDefinitionNode[] | undefined} fieldArguments - The field arguments.
 * @returns {Record<string, string>} An object containing property types.
 */
const generatePropertyTypes = (
  fieldArguments: readonly InputValueDefinitionNode[] | undefined,
  toolDefinition: ToolDefinition,
): Record<string, string> => {
  if (!fieldArguments || fieldArguments.length === 0) {
    return {};
  }

  if (isModelOperationToolPredicate(toolDefinition)) {
    return {};
  }

  return fieldArguments.reduce((acc, fieldArgument) => {
    const name = fieldArgument.name.value;
    const suffix = isNonNullType(fieldArgument.type) ? '!' : '';
    acc[name] = getBaseType(fieldArgument.type) + suffix;
    return acc;
  }, {} as Record<string, string>);
};

const modelListQueryName = (modelTool: ModelOperationTool, ctx: TransformerContextProvider): string => {
  const { modelName } = modelTool;
  const model = getObjectTypeFromName(modelName, ctx);

  const modelDirective = model.directives?.find((directive) => directive.name.value === 'model');
  const queriesArgument = modelDirective?.arguments?.find((arg) => arg.name.value === 'queries');
  const queriesValue = queriesArgument?.value as ObjectValueNode | undefined;
  const listField = queriesValue?.fields?.find((field) => field.name.value === 'list');
  const listValue = listField?.value as StringValueNode | undefined;
  const listQueryArgument = listValue?.value;

  return listQueryArgument ?? getFieldNameFor('list', modelName);
};
