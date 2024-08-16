import { TransformerContextProvider, MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { ObjectTypeDefinitionNode } from 'graphql';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';
import { getBedrockModelId } from '../utils/bedrock-model-id';
import { dedent } from 'ts-dedent';

export const invokeLambdaMappingTemplate = (
  config: ConversationDirectiveConfiguration,
  ctx: TransformerContextProvider,
  bedrockRegion: string,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const { responseMutationInputTypeName, responseMutationName, aiModel } = config;
  const modelId = getBedrockModelId(aiModel);
  const toolDefinitions = JSON.stringify(config.toolSpec);
  const systemPrompt = config.systemPrompt;
//         const graphqlApiEndpoint = ctx.env.GRAPHQL_API_ENDPOINT;

  const graphqlEndpoint = ctx.api.graphqlUrl;
  const req = MappingTemplate.inlineTemplateFromString(dedent`
      export function request(ctx) {
        const { args, identity, source, request, prev } = ctx;
        const { typeName, fieldName } = ctx.stash;
        const toolDefinitions = \`${toolDefinitions}\`;
        const selectionSet = \`${selectionSet}\`;
        const graphqlApiEndpoint = \`${graphqlEndpoint}\`;

        const messages = prev.result.items;
        const responseMutation = {
          name: '${responseMutationName}',
          inputTypeName: '${responseMutationInputTypeName}',
          selectionSet,
        };
        const currentMessageId = ctx.stash.defaultValues.id;
        const modelConfiguration = {
            modelId: '${modelId}',
            systemPrompt: '${systemPrompt}',
            region: '${bedrockRegion}',
        };

        const clientTools = args.toolConfiguration?.tools?.map((tool) => { return { ...tool.toolSpec }});
        const dataTools = JSON.parse(toolDefinitions)?.tools
        const toolsConfiguration = {
          dataTools,
          clientTools,
        };

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
