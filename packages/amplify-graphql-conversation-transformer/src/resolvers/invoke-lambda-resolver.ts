import { TransformerContextProvider, MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { ObjectTypeDefinitionNode } from 'graphql';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';
import { getBedrockModelId } from '../utils/bedrock-model-id';
import { dedent } from 'ts-dedent';

export const invokeLambdaMappingTemplate = (
  config: ConversationDirectiveConfiguration,
  ctx: TransformerContextProvider,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const { responseMutationInputTypeName, responseMutationName, aiModel } = config;
  const modelId = getBedrockModelId(aiModel);
  const toolDefinitions = JSON.stringify(config.toolSpec);

  const systemPrompt = config.systemPrompt;
  const req = MappingTemplate.inlineTemplateFromString(dedent`
      export function request(ctx) {
        const { args, identity, source, request, prev } = ctx;
        const { typeName, fieldName } = ctx.stash;
        const toolDefinitions = \`${toolDefinitions}\`;
        const requestArgs = {
          ...args,
          modelId: '${modelId}',
          responseMutationInputTypeName: '${responseMutationInputTypeName}',
          responseMutationName: '${responseMutationName}',
          graphqlApiEndpoint: ctx.env.GRAPHQL_API_ENDPOINT,
          currentMessageId: ctx.stash.defaultValues.id,
          systemPrompt: '${systemPrompt}',
          toolDefinitions: JSON.parse(toolDefinitions),
          clientToolConfiguration: args.toolConfiguration,
        };

        const payload = {
          typeName,
          fieldName,
          args: requestArgs,
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
