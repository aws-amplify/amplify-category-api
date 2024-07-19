import { MappingTemplate } from "@aws-amplify/graphql-transformer-core";
import { MappingTemplateProvider } from "@aws-amplify/graphql-transformer-interfaces";
import { dedent } from 'ts-dedent';

export const assistantMutationResolver = (): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
    const req = MappingTemplate.inlineTemplateFromString(dedent`
        import { util } from '@aws-appsync/utils';
        import * as ddb from '@aws-appsync/utils/dynamodb';

        /**
         * Sends a request to the attached data source
         * @param {import('@aws-appsync/utils').Context} ctx the context
         * @returns {*} the request
         */
        export function request(ctx) {
            const owner = ctx.identity['claims']['sub'];
            ctx.stash.owner = owner;
            const { conversationId, content, associatedUserMessageId } = ctx.args.input;
            const updatedAt = util.time.nowISO8601();

            return ddb.update({
                key: { id: associatedUserMessageId },
                condition: {
                    owner: { eq: owner },
                    sessionId: { eq: conversationId }
                },
                update: {
                    assistantContent: content,
                    updatedAt
                }
            });
        }
    `);

    const res = MappingTemplate.inlineTemplateFromString(dedent`
        /**
         * Returns the resolver result
         * @param {import('@aws-appsync/utils').Context} ctx the context
         * @returns {*} the result
         */
        export function response(ctx) {
            // Update with response logic
            if (ctx.error) {
                util.error(ctx.error.message, ctx.error.type);
            }

            const { conversationId, content, associatedUserMessageId } = ctx.args.input;

            return {
              id: associatedUserMessageId,
              content,
              sessionId: conversationId,
              sender: 'assistant',
              owner: ctx.stash.owner,
            };
        }
      `);

    return { req, res };
  };