import { TransformerContextProvider, MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';
import { dedent } from 'ts-dedent';
import { JSResolverFunctionProvider } from './js-resolver-function-provider';

/**
 * Creates a mapping template for invoking a Lambda function in the context of a GraphQL conversation.
 *
 * @param {ConversationDirectiveConfiguration} config - The configuration for the conversation directive.
 * @param {TransformerContextProvider} ctx - The transformer context provider.
 * @returns {JSResolverFunctionProvider} An object containing request and response mapping functions.
 */
export const invokeLambdaMappingTemplate = (
  config: ConversationDirectiveConfiguration,
  ctx: TransformerContextProvider,
): JSResolverFunctionProvider => {
  const req = createInvokeLambdaRequestFunction(config, ctx);
  const res = createInvokeLambdaResponseFunction(config);
  return { req, res };
};

/**
 * Creates a request function for invoking a Lambda function in the context of a GraphQL conversation.
 * This function prepares the necessary data and configuration for the Lambda invocation.
 *
 * @param {ConversationDirectiveConfiguration} config - The configuration for the conversation directive.
 * @param {TransformerContextProvider} ctx - The transformer context provider.
 * @returns {MappingTemplateProvider} A function that generates the request mapping template.
 */
const createInvokeLambdaRequestFunction = (
  config: ConversationDirectiveConfiguration,
  ctx: TransformerContextProvider,
): MappingTemplateProvider => {
  const { responseMutationInputTypeName, responseMutationName } = config;
  const toolDefinitions = JSON.stringify(config.toolSpec);
  const toolDefinitionsLine = toolDefinitions ? `const toolDefinitions = ${toolDefinitions};` : '';
  const modelConfigurationLine = generateModelConfigurationLine(config);
  const graphqlEndpoint = ctx.api.graphqlUrl;

  const toolsConfigurationLine = toolDefinitions
    ? dedent`const dataTools = toolDefinitions.tools
     const toolsConfiguration = {
      dataTools,
      clientTools,
    };`
    : dedent`const toolsConfiguration = {
      clientTools
    };`;

  const requestFunctionString = `
  import { util } from '@aws-appsync/utils';

  export function request(ctx) {
    const { args, identity, source, request, prev } = ctx;
    const { typeName, fieldName } = ctx.stash;
    ${toolDefinitionsLine}
    const selectionSet = '${selectionSet}';
    const graphqlApiEndpoint = '${graphqlEndpoint}';

    const messages = prev.result.items;
    const responseMutation = {
      name: '${responseMutationName}',
      inputTypeName: '${responseMutationInputTypeName}',
      selectionSet,
    };
    const currentMessageId = ctx.stash.defaultValues.id;
    ${modelConfigurationLine}

    const clientTools = args.toolConfiguration?.tools?.map((tool) => { return { ...tool.toolSpec }});
    ${toolsConfigurationLine}

    const requestArgs = {
      ...args,
      currentMessageId,
      responseMutation,
      graphqlApiEndpoint,
      modelConfiguration,
      toolsConfiguration,
      messages,
    };

    const payload = {
      typeName,
      fieldName,
      ...requestArgs,
      identity,
      source,
      request,
      prev
    };

    return {
      operation: 'Invoke',
      payload,
      invocationType: 'Event'
    };
  }`;

  return MappingTemplate.inlineTemplateFromString(dedent(requestFunctionString));
};

const createInvokeLambdaResponseFunction = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  const responseFunctionString = `
  export function response(ctx) {
    let success = true;
    if (ctx.error) {
      util.appendError(ctx.error.message, ctx.error.type);
      success = false;
    }
    const response = {
        __typename: '${config.messageModel.messageModel.name.value}',
        id: ctx.stash.defaultValues.id,
        conversationId: ctx.args.conversationId,
        role: 'user',
        content: ctx.args.content,
        createdAt: ctx.stash.defaultValues.createdAt,
        updatedAt: ctx.stash.defaultValues.updatedAt,
    };
    return response;
  }`;

  return MappingTemplate.inlineTemplateFromString(dedent(responseFunctionString));
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
    systemPrompt: '${systemPrompt}',
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
 *
 * @type {string}
 */
const selectionSet = `id conversationId content { image { format source { bytes }} text toolUse { toolUseId name input } toolResult { status toolUseId content { json text image { format source { bytes }} document { format name source { bytes }} }}} role owner createdAt updatedAt`;
