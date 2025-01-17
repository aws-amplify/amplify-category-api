import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

/**
 * Sends a request to the attached data source
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the request
 */
export function request(ctx) {
  const {
    conversationId,
    associatedUserMessageId,
    accumulatedTurnContent,
    errors,
  } = ctx.args.input;

  const { owner } = ctx.args;

  if (errors) {
    runtime.earlyReturn({
      id: `${associatedUserMessageId}#response`,
      conversationId,
      associatedUserMessageId,
      errors,
      owner,
    });
  }
  const { createdAt, updatedAt } = ctx.stash.defaultValues;

  const assistantResponseId = `${associatedUserMessageId}#response`;
  const expression = 'SET #typename = :typename, #conversationId = :conversationId, #associatedUserMessageId = :associatedUserMessageId, #role = :role, #content = :content, #owner = :owner, #createdAt = if_not_exists(#createdAt, :createdAt), #updatedAt = :updatedAt';

  const expressionValues = util.dynamodb.toMapValues({
    ':typename': '[[CONVERSATION_MESSAGE_TYPE_NAME]]',
    ':conversationId': conversationId,
    ':associatedUserMessageId': associatedUserMessageId,
    ':role': 'assistant',
    ':content': accumulatedTurnContent,
    ':owner': owner,
    ':createdAt': createdAt,
    ':updatedAt': updatedAt,
  });

  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html
  const expressionNames = {
    '#typename': '__typename',
    '#conversationId': 'conversationId',
    '#associatedUserMessageId': 'associatedUserMessageId',
    '#role': 'role',
    '#content': 'content',
    '#owner': 'owner',
    '#createdAt': 'createdAt',
    '#updatedAt': 'updatedAt',
  };

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ id: assistantResponseId }),
    update: {
      expression,
      expressionValues,
      expressionNames,
    },
  };
}

/**
 * Returns the resolver result
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the result
 */
export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  const streamId = `${ctx.args.input.associatedUserMessageId}#stream`;
  const { owner } = ctx.args;
  const event = ctx.args.input;
  const padding = generateRandomPadding();

  const streamEvent = {
    p: padding,
    ...event,
    __typename: 'ConversationMessageStreamPart',
    id: streamId,
    owner,
  };

  // TODO: The lambda event should provide the toolUse directly.
  if (event.contentBlockToolUse && event.contentBlockToolUse.toolUse) {
    streamEvent.contentBlockToolUse = event.contentBlockToolUse.toolUse;
  }

  return streamEvent;
}

function generateRandomPadding() {
  const base = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const rand = Math.floor(Math.random() * 36);
  return base.slice(0, rand);
}