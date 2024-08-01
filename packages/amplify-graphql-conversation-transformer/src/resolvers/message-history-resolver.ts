import { MappingTemplate } from "@aws-amplify/graphql-transformer-core";
import { MappingTemplateProvider } from "@aws-amplify/graphql-transformer-interfaces";
import { dedent } from 'ts-dedent';


export const readHistoryMappingTemplate = (fieldName: string): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
    // TODO: filter to only retrieve messages that have an assistant response.
    // #set( $ctx.args.filter = { "and": [ { "or": $authRuntimeFilter }, $ctx.args.filter ]} )
    const req = MappingTemplate.inlineTemplateFromString(dedent`
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

      }
      `);

    const res = MappingTemplate.inlineTemplateFromString(dedent`
      export function response(ctx) {
        if (ctx.error) {
          util.error(ctx.error.message, ctx.error.type);
        }
        const messagesWithAssistantResponse = ctx.result.items
          .filter((message) => message.assistantContent !== undefined)
          .reduce((acc, current) => {
              acc.push({ role: 'user', content: [{ text: current.content }] });
              acc.push({ role: 'assistant', content: [{ text: current.assistantContent }] });
              return acc;
          }, [])

        const currentMessage = { role: 'user', content: [{ text: ctx.prev.result.content }] };
        const items = [...messagesWithAssistantResponse, currentMessage];
        return { items };
      }`);

    return { req, res };
  };