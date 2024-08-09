import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode, Kind } from 'graphql';
import { getBaseType, isScalar } from 'graphql-transformer-common';
import { convertInputValueToJSONSchema, JSONSchema } from './graphql-json-schema-type';

export type ToolDefinition = {
  name: string;
  description: string;
};

export type Tools = {
  tools: Tool[];
};

type Tool = {
  toolSpec: ToolSpec;
};

type GraphQlRequestInputMetadata = {
  selectionSet: string[];
  propertyTypes: Record<string, string>;
};

type ToolSpec = {
  name: string;
  description: string;
  gqlRequestInputMetadata?: GraphQlRequestInputMetadata;
  inputSchema: {
    json: JSONSchema;
  };
};

const getObjectTypeFromName = (name: string, ctx: TransformerContextProvider): ObjectTypeDefinitionNode => {
  const node = ctx.inputDocument.definitions.find((d: any) => d.kind === Kind.OBJECT_TYPE_DEFINITION && d.name.value === name) as
    | ObjectTypeDefinitionNode
    | undefined;
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
    const { name, description } = toolDefinition;
    const matchingQueryField = fields.find((field) => field.name.value === name);
    if (!matchingQueryField) {
      // TODO: better error message.
      throw new InvalidDirectiveError(`Tool ${name} defined in @conversation directive but no matching Query field definition`);
    }

    let toolProperties: Record<string, JSONSchema> = {};
    let required: string[] = [];
    const fieldArguments = matchingQueryField.arguments;
    if (fieldArguments && fieldArguments.length > 0) {
      for (const fieldArgument of fieldArguments) {
        const fieldArgumentSchema = convertInputValueToJSONSchema(fieldArgument, ctx);
        // TODO: How do we allow description to be defined in the directive?
        toolProperties = { ...toolProperties, [fieldArgument.name.value]: fieldArgumentSchema };
        if (fieldArgument.type.kind === 'NonNullType') {
          required.push(fieldArgument.name.value);
        }
      }
    }

    const empty: GraphQlRequestInputMetadata = {
      selectionSet: [],
      propertyTypes: {},
    };

    const gqlRequestInputMetadata: GraphQlRequestInputMetadata | undefined = fieldArguments?.reduce((acc, fieldArgument) => {
      const { selectionSet, propertyTypes } = acc;
      const name = fieldArgument.name.value;
      const returnType = matchingQueryField.type;
      if (returnType.kind === 'ListType') {
        // TODO: handle list types
        throw Error('not supporting list type responses');
      } else if (returnType.kind === 'NamedType') {
        if (!isScalar(returnType)) {
          const type = getObjectTypeFromName(returnType.name.value, ctx);
          const fields = type.fields?.map((field) => field.name.value);
          if (fields) {
            selectionSet.push(...fields);
          } else {
            // TODO: handle
          }
        }
      } else if (returnType.kind === 'NonNullType') {
        const baseType = getBaseType(returnType);
        const type = getObjectTypeFromName(baseType, ctx);
        const fields = type.fields?.map((field) => field.name.value);
        if (fields) {
          selectionSet.push(...fields);
        } else {
          // TODO: handle
        }
      }
      propertyTypes[name] = getBaseType(fieldArgument.type);
      return { selectionSet, propertyTypes };
    }, empty);

    const tool: Tool = {
      toolSpec: {
        name,
        description,
        inputSchema: {
          json: {
            type: 'object',
            properties: toolProperties,
            required,
          },
        },
        gqlRequestInputMetadata,
      },
    };
    tools.push(tool);
  }

  return { tools };
};
