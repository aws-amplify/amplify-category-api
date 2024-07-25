import { TransformerContextProvider, MappingTemplateProvider } from "@aws-amplify/graphql-transformer-interfaces";
import { MappingTemplate } from "@aws-amplify/graphql-transformer-core";
import { ObjectTypeDefinitionNode } from "graphql";
import { ConversationDirectiveConfiguration } from "../grapqhl-conversation-transformer";
import { getBedrockModelId } from "../utils/bedrock-model-id";
import { dedent } from 'ts-dedent';

export const invokeLambdaMappingTemplate = (
    config: ConversationDirectiveConfiguration,
    ctx: TransformerContextProvider,
  ): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
    const { responseMutationInputTypeName, responseMutationName, aiModel } = config;
    const modelId = getBedrockModelId(aiModel);
    // TODO: figure out how to / if it's possible to get the GraphQL API endpoint
    // to include in the resolver here. It should be doable considered the apiId is accessible
    // on ctx.api. But this doesn't work.
    // const graphQlUrl = (ctx.api as any).graphQlUrl;

    /*
        "tools": [
          {
              "toolSpec": {
                  "name": "top_song",
                  "description": "Get the most popular song played on a radio station.",
                  "inputSchema": {
                      "json": {
                          "type": "object",
                          "properties": {
                              "sign": {
                                  "type": "string",
                                  "description": "The call sign for the radio station for which you want the most popular song. Example calls signs are WZPZ and WKRP."
                              }
                          },
                          "required": [
                              "sign"
                          ]
                      }
                  }
              }
          }
      ]
    */

    //   const tool = queryTools[0];

    // const foo = {
    //   toolSpec: {
    //     name: tool?.name.value,
    //     description: '', // config.tools[].description
    //     inputSchema: {
    //       json: {
    //         type: 'object',
    //         properties: {
    //           tool.na
    //         }
    //       }
    //     }
    //   }
    // }
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
            sessionId: ctx.args.sessionId,
            sender: 'user',
            content: ctx.args.content,
            createdAt: ctx.stash.defaultValues.createdAt,
            updatedAt: ctx.stash.defaultValues.updatedAt,
        };
        return response;
      }`);

    return { req, res };
  };