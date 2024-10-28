import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

/**
 * Sends a request to the attached data source
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the request
 */
export function request(ctx) {
  const {
    // required
    conversationId,
    associatedUserMessageId,
    contentBlockIndex,
    // text chunk
    contentBlockText,
    contentBlockDeltaIndex,
    // tool use
    contentBlockToolUse,
    // block complete
    contentBlockDoneAtIndex,
    // turn complete
    stopReason,
    // well-formed content block representing accumulated text
    accumulatedTurnContent
  } = ctx.args.input;

  const { owner } = ctx.args;
  const streamId = `${associatedUserMessageId}#stream`;

  if (stopReason) {
    // should we be writing the turn complete chunk here?
    // probably not. It's just the marker for us to reconcile the chunks.
    return ddb.get({ key: { id: streamId } });
  }

  // not using this yet. we'll need to enable ttl on the table first.
  const now = util.time.nowEpochSeconds()
  const ttl = now + 60 * 60 * 24; // 1 day

  const event = {
    contentBlockIndex,
    contentBlockDeltaIndex,
    contentBlockText,
    contentBlockToolUse,
    contentBlockDoneAtIndex,
  };

  // AppSync JS runtime doesn't support Object.fromEntries
  const chunk = Object.keys(event)
  .filter((k) => event[k] != null)
  .reduce((a, k) => ({ ...a, [k]: event[k] }), {});

  // TODO: Use expression names for all attributes.
  // reference: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html
  const setExpression = 'SET events = list_append(if_not_exists(events, :empty_list), :events), conversationId = :conversationId, #owner = :owner'
  const id = streamId
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ id }),
    update: {
      expression: setExpression,
      expressionValues: util.dynamodb.toMapValues({
        ':events': [chunk],
        ':empty_list': [],
        ':conversationId': conversationId,
        ':owner': owner,
      }),
      expressionNames: {
        '#owner': 'owner',
      },
    },
  };
}

/**
 * Returns the resolver result
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the result
 */
export function response(ctx) {
  console.log('>>> response function ctx <<<', ctx);
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  const { conversationId } = ctx.result;
  const { owner } = ctx.args;

  if (ctx.args.input.contentBlockToolUse && ctx.args.input.contentBlockToolUse.toolUse) {
    console.log('>>> contentBlockToolUse <<<', ctx.args.input.contentBlockToolUse);

    return {
      __typename: 'ConversationMessageStreamPart',
      ...ctx.args.input,
      id: `${ctx.args.input.associatedUserMessageId}#stream`,
      owner,
      conversationId,
      contentBlockToolUse: ctx.args.input.contentBlockToolUse.toolUse,
    }
  }

  if (ctx.args.input.contentBlockText) {
    console.log('>>> contentBlockText <<<', ctx.args.input.contentBlockText);
    return {
      __typename: 'ConversationMessageStreamPart',
      ...ctx.args.input,
      id: `${ctx.args.input.associatedUserMessageId}#stream`,
      owner,
      conversationId,
    };
  }

  if (ctx.args.input.contentBlockDoneAtIndex) {
    console.log('>>> contentBlockDoneAtIndex <<<', ctx.args.input.contentBlockDoneAtIndex);
    // Do we actually need this event? It's forcing us to return a value to the client here, which is awkward... maybe.
    return {
      ...ctx.args.input,
      id: `${ctx.args.input.associatedUserMessageId}#stream`,
      owner,
      conversationId,
    }
  }

  console.log('>>> stopReason <<<', ctx.args.input.stopReason);
  return ctx.result;
}
