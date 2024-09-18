import { TransformerContextProvider, MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';
import fs from 'fs';
import path from 'path';
import dedent from 'ts-dedent';

/**
 * Creates a mapping template for invoking a Lambda function in the context of a GraphQL conversation.
 *
 * @param {ConversationDirectiveConfiguration} config - The configuration for the conversation directive.
 * @param {TransformerContextProvider} ctx - The transformer context provider.
 * @returns {MappingTemplateProvider} An object containing request and response mapping functions.
 */
export const invokeLambdaMappingTemplate = (
  config: ConversationDirectiveConfiguration,
  ctx: TransformerContextProvider,
): MappingTemplateProvider => {
  const { TOOL_DEFINITIONS_LINE, TOOLS_CONFIGURATION_LINE } = generateToolLines(config);
  const SELECTION_SET = selectionSet;
  const GRAPHQL_API_ENDPOINT = ctx.api.graphqlUrl;
  const MODEL_CONFIGURATION_LINE = generateModelConfigurationLine(config);
  const RESPONSE_MUTATION_NAME = config.responseMutationName;
  const RESPONSE_MUTATION_INPUT_TYPE_NAME = config.responseMutationInputTypeName;
  const MESSAGE_MODEL_NAME = config.messageModel.messageModel.name.value;

  const substitutions = {
    TOOL_DEFINITIONS_LINE,
    TOOLS_CONFIGURATION_LINE,
    SELECTION_SET,
    GRAPHQL_API_ENDPOINT,
    MODEL_CONFIGURATION_LINE,
    RESPONSE_MUTATION_NAME,
    RESPONSE_MUTATION_INPUT_TYPE_NAME,
    MESSAGE_MODEL_NAME,
  };

  let resolver = fs.readFileSync(path.join(__dirname, 'invoke-lambda-resolver-fn.js'), 'utf8');
  Object.entries(substitutions).forEach(([key, value]) => {
    const replaced = resolver.replace(new RegExp(key, 'g'), value);
    resolver = replaced;
  });

  // This unfortunately needs to be an inline template because an s3 mapping template doesn't allow the CDK
  // to substitute token values, which is necessaru for this resolver function due to its  reference of
  // `ctx.api.graphqlUrl`.
  return MappingTemplate.inlineTemplateFromString(resolver);
};

const generateToolLines = (config: ConversationDirectiveConfiguration) => {
  const toolDefinitions = JSON.stringify(config.toolSpec);
  const TOOL_DEFINITIONS_LINE = toolDefinitions ? `const toolDefinitions = ${toolDefinitions};` : '';


  const TOOLS_CONFIGURATION_LINE = toolDefinitions
    ? dedent`const dataTools = toolDefinitions.tools;
     const toolsConfiguration = {
      dataTools,
      clientTools,
    };`
    : dedent`const toolsConfiguration = {
      clientTools
    };`;

    return { TOOL_DEFINITIONS_LINE, TOOLS_CONFIGURATION_LINE };
};



/**
 * Generates a line of code for the model configuration in the context of a GraphQL conversation.
 *
 * @param {ConversationDirectiveConfiguration} config - The configuration for the conversation directive.
 * @returns {string} A string containing the model configuration line.
 */
const generateModelConfigurationLine = (config: ConversationDirectiveConfiguration) => {
  const { aiModel, systemPrompt } = config;

  return dedent`const modelConfiguration = {
    modelId: '${aiModel}',
    systemPrompt: ${JSON.stringify(systemPrompt)},
    ${generateModelInferenceConfigurationLine(config)}
  };`;
};

/**
 * Generates a line of code for the model inference configuration in the context of a GraphQL conversation.
 *
 * @param {ConversationDirectiveConfiguration} config - The configuration for the conversation directive.
 * @returns {string} A string containing the model inference configuration line.
 */
const generateModelInferenceConfigurationLine = (config: ConversationDirectiveConfiguration) => {
  const { inferenceConfiguration } = config;
  return inferenceConfiguration && Object.keys(inferenceConfiguration).length > 0
    ? dedent`inferenceConfiguration: ${JSON.stringify(config.inferenceConfiguration)},`
    : '';
};

/**
 * The selection set for the conversation message.
 */
const selectionSet = `id conversationId content { image { format source { bytes }} text toolUse { toolUseId name input } toolResult { status toolUseId content { json text image { format source { bytes }} document { format name source { bytes }} }}} role owner createdAt updatedAt`;




// /**
//  * Creates a request function for invoking a Lambda function in the context of a GraphQL conversation.
//  * This function prepares the necessary data and configuration for the Lambda invocation.
//  *
//  * @param {ConversationDirectiveConfiguration} config - The configuration for the conversation directive.
//  * @param {TransformerContextProvider} ctx - The transformer context provider.
//  * @returns {MappingTemplateProvider} A function that generates the request mapping template.
//  */
// const createInvokeLambdaRequestFunction = (
//   config: ConversationDirectiveConfiguration,
//   ctx: TransformerContextProvider,
// ): MappingTemplateProvider => {
//   const { responseMutationInputTypeName, responseMutationName } = config;
//   const toolDefinitions = JSON.stringify(config.toolSpec);
//   const toolDefinitionsLine = toolDefinitions ? `const toolDefinitions = ${toolDefinitions};` : '';
//   const modelConfigurationLine = generateModelConfigurationLine(config);
//   const graphqlEndpoint = ctx.api.graphqlUrl;

//   const toolsConfigurationLine = toolDefinitions
//     ? dedent`const dataTools = toolDefinitions.tools;
//      const toolsConfiguration = {
//       dataTools,
//       clientTools,
//     };`
//     : dedent`const toolsConfiguration = {
//       clientTools
//     };`;

//   const requestFunctionString = `
//   import { util } from '@aws-appsync/utils';

//   export function request(ctx) {
//     const { args, identity, request, prev } = ctx;
//     ${toolDefinitionsLine}
//     const selectionSet = '${selectionSet}';
//     const graphqlApiEndpoint = '${graphqlEndpoint}';

//     const messages = prev.result.items;
//     const responseMutation = {
//       name: '${responseMutationName}',
//       inputTypeName: '${responseMutationInputTypeName}',
//       selectionSet,
//     };
//     const currentMessageId = ctx.stash.defaultValues.id;
//     ${modelConfigurationLine}

//     const clientTools = args.toolConfiguration?.tools?.map((tool) => { return { ...tool.toolSpec }});
//     ${toolsConfigurationLine}

//     const authHeader = request.headers['authorization'];
//     const payload = {
//       conversationId: args.conversationId,
//       currentMessageId,
//       responseMutation,
//       graphqlApiEndpoint,
//       modelConfiguration,
//       request: { headers: { authorization: authHeader }},
//       messages,
//       toolsConfiguration,
//     };

//     return {
//       operation: 'Invoke',
//       payload,
//       invocationType: 'Event'
//     };
//   }`;

//   return MappingTemplate.inlineTemplateFromString(dedent(requestFunctionString));
// };

// const createInvokeLambdaResponseFunction = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
//   const responseFunctionString = `
//   export function response(ctx) {
//     let success = true;
//     if (ctx.error) {
//       util.appendError(ctx.error.message, ctx.error.type);
//       success = false;
//     }
//     const response = {
//         __typename: '${config.messageModel.messageModel.name.value}',
//         id: ctx.stash.defaultValues.id,
//         conversationId: ctx.args.conversationId,
//         role: 'user',
//         content: ctx.args.content,
//         createdAt: ctx.stash.defaultValues.createdAt,
//         updatedAt: ctx.stash.defaultValues.updatedAt,
//     };
//     return response;
//   }`;

//   return MappingTemplate.inlineTemplateFromString(dedent(responseFunctionString));
// };