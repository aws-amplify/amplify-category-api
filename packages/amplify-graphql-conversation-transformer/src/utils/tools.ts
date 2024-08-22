import { InvalidDirectiveError, isModelType } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode, Kind, TypeNode, FieldDefinitionNode } from 'graphql';
import { getBaseType, isScalar } from 'graphql-transformer-common';
import { generateJSONSchemaFromTypeNode, JSONSchema } from './graphql-json-schema-type';

export type ToolDefinition = {
  name: string;
  description: string;
};

export type Tools = {
  tools: Tool[];
};

type GraphQLRequestInputDescriptor = {
  selectionSet: string;
  propertyTypes: Record<string, string>;
  queryName: string;
};

type Tool = {
  name: string;
  description: string;
  inputSchema: {
    json: JSONSchema;
  };
  graphqlRequestInputDescriptor?: GraphQLRequestInputDescriptor;
};
const generateSelectionSet = (
  currentType: TypeNode,
  ctx: TransformerContextProvider,
  seenTypes: Set<string> = new Set(),
  fieldName: string = '',
): string => {
  if (isScalar(currentType)) {
    return fieldName;
  }

  const typeName = getBaseType(currentType);
  if (seenTypes.has(typeName)) {
    return '';
  }

  const type = getObjectTypeFromName(typeName, ctx);
  seenTypes.add(type.name.value);

  const { fields } = type;
  if (!fields || fields.length === 0) {
    return '';
  }

  let selectionSet = '';

  for (const field of fields) {
    if (isScalar(field.type)) {
      selectionSet += ` ${field.name.value}`;
    } else {
      const nestedSelection = generateSelectionSet(field.type, ctx, new Set(seenTypes), field.name.value);
      if (nestedSelection) {
        selectionSet += ` ${field.name.value} { ${nestedSelection} }`;
      }
    }
  }

  return selectionSet.trim();
};

const getObjectTypeFromName = (name: string, ctx: TransformerContextProvider): ObjectTypeDefinitionNode => {
  const node = ctx.output.getObject(name);
  if (!node) {
    throw Error(`Could not find type definition for ${name}`);
  }
  return node;
};

export const processTools = (toolDefinitions: ToolDefinition[], ctx: TransformerContextProvider): Tools | undefined => {
  if (!toolDefinitions || toolDefinitions.length === 0) {
    return undefined;
  }
  const { fields } = ctx.output.getType('Query') as ObjectTypeDefinitionNode;
  if (!fields) {
    // TODO: better error message.
    throw new InvalidDirectiveError('tools must be queries -- no queries found');
  }

  let tools: Tool[] = [];
  for (const toolDefinition of toolDefinitions) {
    const { name: toolName, description } = toolDefinition;
    const matchingQueryField = fields.find((field) => field.name.value === toolName);
    if (!matchingQueryField) {
      // TODO: better error message.
      throw new InvalidDirectiveError(`Tool ${name} defined in @conversation directive but no matching Query field definition`);
    }

    let toolProperties: Record<string, JSONSchema> = {};
    let required: string[] = [];
    const fieldArguments = matchingQueryField.arguments;
    if (getBaseType(matchingQueryField.type).startsWith('Model') && toolName.startsWith('list')) {
    } else if (fieldArguments && fieldArguments.length > 0) {
      for (const fieldArgument of fieldArguments) {
        const fieldArgumentSchema = generateJSONSchemaFromTypeNode(fieldArgument.type, ctx);
        // TODO: How do we allow description to be defined in the directive?
        toolProperties = { ...toolProperties, [fieldArgument.name.value]: fieldArgumentSchema };
        if (fieldArgument.type.kind === 'NonNullType') {
          required.push(fieldArgument.name.value);
        }
      }
    }

    const returnType = matchingQueryField.type;
    let selectionSet: string;
    if (isScalar(returnType)) {
      selectionSet = '';
    } else {
      selectionSet = generateSelectionSet(returnType, ctx).trim();
    }

    const empty: GraphQLRequestInputDescriptor = {
      selectionSet,
      propertyTypes: {},
      queryName: '',
    };

    const graphqlRequestInputDescriptor: GraphQLRequestInputDescriptor | undefined = fieldArguments?.reduce((acc, fieldArgument) => {
      const { selectionSet, propertyTypes } = acc;
      const name = fieldArgument.name.value;
      if (getBaseType(matchingQueryField.type).startsWith('Model') && toolName.startsWith('list')) {
      } else {
        propertyTypes[name] = getBaseType(fieldArgument.type);
      }
      return { selectionSet, propertyTypes, queryName: toolName };
    }, empty);

    const tool: Tool = {
      name: toolName,
      description,
      inputSchema: {
        json: {
          type: 'object',
          properties: toolProperties,
          required,
        },
      },
      graphqlRequestInputDescriptor,
    };
    tools.push(tool);
  }

  return { tools };
};
