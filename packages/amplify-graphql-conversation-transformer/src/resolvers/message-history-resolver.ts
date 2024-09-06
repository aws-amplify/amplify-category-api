import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';
import { JSResolverFunctionProvider } from './js-resolver-function-provider';

/**
 * Creates a mapping template for reading message history in a conversation.
 *
 * @returns {JSResolverFunctionProvider} An object containing request and response mapping functions.
 */
export const readHistoryMappingTemplate = (): JSResolverFunctionProvider => {
  // TODO: filter to only retrieve messages that have an assistant response.
  const req = createMessageHistoryRequestFunction();
  const res = createMessageHistoryResponseFunction();

  return { req, res };
};

/**
 * Creates a request mapping template for reading message history in a conversation.
 *
 * @returns {MappingTemplateProvider} A mapping template provider for the request function.
 */
const createMessageHistoryRequestFunction = (): MappingTemplateProvider => {
  const requestFunctionString = `
      export function request(ctx) {
        const { conversationId } = ctx.args;
        const { authFilter } = ctx.stash;

        const limit = 100;
        const query = {
          expression: 'conversationId = :conversationId',
          expressionValues: util.dynamodb.toMapValues({
            ':conversationId': ctx.args.conversationId
          })
        };

        const filter = JSON.parse(util.transform.toDynamoDBFilterExpression(authFilter));
        const index = 'gsi-ConversationMessage.conversationId.createdAt';

        return {
          operation: 'Query',
          query,
          filter,
          index,
          scanIndexForward: false,
        }
      }`;

  return MappingTemplate.inlineTemplateFromString(dedent(requestFunctionString));
};

/**
 * Creates a response mapping template for reading message history in a conversation.
 *
 * @returns {MappingTemplateProvider} A mapping template provider for the response function.
 */
const createMessageHistoryResponseFunction = (): MappingTemplateProvider => {
  const responseFunctionString = `
      export function response(ctx) {
        if (ctx.error) {
          util.error(ctx.error.message, ctx.error.type);
        }
        const messagesWithAssistantResponse = ctx.result.items
          .filter((message) => message.assistantContent !== undefined)
          .reduce((acc, current) => {
              acc.push({ role: 'user', content: current.content });
              acc.push({ role: 'assistant', content: current.assistantContent });
              return acc;
          }, [])

        const currentMessage = { role: 'user', content: ctx.prev.result.content };
        const items = [...messagesWithAssistantResponse, currentMessage];
        return { items };
      }`;

  return MappingTemplate.inlineTemplateFromString(dedent(responseFunctionString));
};
