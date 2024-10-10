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
    contentBlockDeltaText,
    contentBlockDeltaIndex,
    // tool use
    contentBlockToolUse,
    // block complete
    contentBlockDoneAtIndex,
    // turn complete
    stopReason,
  } = ctx.args.input;

  const { owner } = ctx.args;
  const defaultValues = ctx.stash.defaultValues ?? {};
  const id = defaultValues.id;
  const streamId = `${associatedUserMessageId}#stream`;

  if (stopReason) {
    return ddb.get({ key: { id: streamId } });
    // reconcile the assistantResponse ordering based on chunk indexes in the response resolver.
  }

  if (contentBlockDoneAtIndex) {
    // reconcile the assistantResponse ordering based on chunk indexes.
  }

  if (contentBlockDeltaIndex && contentBlockDeltaText) {
    // append the chunk to the existing content at contentBlockIndex
    contentBlockIndex
  }

  if (contentBlockToolUse) {
    // insert the full toolUse block at contentBlockIndex
  }


  // 1. if there is no assistantResponse with the associatedUserMessageId, create one
  //    - read from conversation message table
  // 2. if there is an assistantResponse, append this chunk to the existing content
  // 3. write chunk to table with TTL
  // 4. if input contains stopReason, reconcile the assistantResponse ordering based on chunk indexes. (maybe step 1.)


  /*
   persist each event --- somewhere ---
   use `UpdateItem` because it updates or adds the item if it doesn't exist.
   use update expression
   use TTL for events. note -- this requires enabling ttl on the table.
   on `stopReason`, reduce the events into a single item.

   use associatedUserMessageId#stream as the id

   do this for text and tool use.
  */

  const ttl = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 1 day

  const streamItem = {
    id: streamId,
    conversationId,
    ttl,
    owner,
    role: 'assistant',
    events: [
      {
        contentBlockIndex,
        contentBlockDeltaIndex,
        contentBlockDeltaText,
        contentBlockToolUse,
        contentBlockDoneAtIndex,
        stopReason,
      },
    ],
  };

  // update item -- set new event via append_...

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

  // UpdateExpression: 'SET events = list_append(if_not_exists(events, :empty_list), :event)'
  // ExpressionAttributeValues: { ":event": [{ ... }], ":empty_list": [] }

  const update = {
  events: ddb.operations.append(ddb.operations.if_not_exists(streamItem.events, []), streamItem.events),
}

  // return ddb.update({ key: { streamId}, update: })
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
