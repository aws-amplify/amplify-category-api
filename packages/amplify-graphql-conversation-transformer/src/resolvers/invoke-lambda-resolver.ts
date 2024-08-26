import { TransformerContextProvider, MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';
import { getBedrockModelId } from '../utils/bedrock-model-id';
import { dedent } from 'ts-dedent';

const generateModelConfigurationLine = (config: ConversationDirectiveConfiguration) => {
  const { aiModel, systemPrompt } = config;
  // TODO: remove this once model ids are provided from schema builder.
  const modelId = getBedrockModelId(aiModel);

  return dedent`const modelConfiguration = {
    modelId: '${modelId}',
    systemPrompt: '${systemPrompt}',
    ${generateModelInferenceConfigurationLine(config)}
  };`;
};

const generateModelInferenceConfigurationLine = (config: ConversationDirectiveConfiguration) => {
  return config.inferenceConfiguration ? dedent`inferenceConfiguration: ${JSON.stringify(config.inferenceConfiguration)},` : '';
};

export const invokeLambdaMappingTemplate = (
  config: ConversationDirectiveConfiguration,
  ctx: TransformerContextProvider,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const { responseMutationInputTypeName, responseMutationName } = config;
  const toolDefinitions = JSON.stringify(config.toolSpec);
  const toolDefinitionsLine = toolDefinitions ? `const toolDefinitions = ${toolDefinitions};` : '';

  const toolsConfigurationLine = toolDefinitions
    ? dedent`const dataTools = JSON.parse(toolDefinitions)?.tools
     const toolsConfiguration = {
      dataTools,
      clientTools,
    };`
    : dedent`const toolsConfiguration = {
      clientTools
    };`;

  /*
        const dataTools = JSON.parse(toolDefinitions)?.tools
        const toolsConfiguration = {
          dataTools,
          clientTools,
        };
    */

  const modelConfigurationLine = generateModelConfigurationLine(config);

  const graphqlEndpoint = ctx.api.graphqlUrl;
  const req = MappingTemplate.inlineTemplateFromString(dedent`
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
      }`);

  const res = MappingTemplate.inlineTemplateFromString(dedent`
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
      }`);

  return { req, res };
};

const selectionSet = `id conversationId content { image { format source { bytes }} text toolUse { toolUseId name input } toolResult { status toolUseId content { json text image { format source { bytes }} document { format name source { bytes }} }}} role owner createdAt updatedAt`;
