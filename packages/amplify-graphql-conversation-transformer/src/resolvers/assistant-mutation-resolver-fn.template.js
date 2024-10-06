import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

/**
 * Sends a request to the attached data source
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the request
 */
export function request(ctx) {
  const { conversationId, content, associatedUserMessageId } = ctx.args.input;
  const { owner } = ctx.args;
  const defaultValues = ctx.stash.defaultValues ?? {};
  const id = defaultValues.id;

  const message = {
    __typename: '[[CONVERSATION_MESSAGE_TYPE_NAME]]',
    id,
    role: 'assistant',
    content,
    conversationId,
    associatedUserMessageId,
    owner,
    ...defaultValues,
  };

  return ddb.put({ key: { id }, item: message });
}

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

  return ctx.result;
}
