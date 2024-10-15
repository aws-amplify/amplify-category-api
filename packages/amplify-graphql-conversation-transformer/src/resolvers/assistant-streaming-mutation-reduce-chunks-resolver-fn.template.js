import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

 /**
 * Sends a request to the attached data source
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the request
 */
export function request(ctx) {
    if (!ctx.args.input.stopReason) {
      runtime.earlyReturn(ctx.prev.result);
    }
    const { id, createdAt, updatedAt } = ctx.stash.defaultValues;
    const { events } = ctx.prev.result;

    const content = reduceChunks(events);
    const assistantMessage = {
        __typename: 'ConversationMessageCustomChat',
        role: 'assistant',
        createdAt,
        updatedAt,
        conversationId: ctx.args.input.conversationId,
        associatedUserMessageId: ctx.args.input.associatedUserMessageId,
        owner: ctx.args.owner,
        content
    }
    // TODO: check if `stopReason` really means end of turn.
    // `put` if it does
    // `update` if it doesn't
    return ddb.put({ key: { id }, item: assistantMessage })
}


/**
 * Returns the resolver result
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the result
 */
export function response(ctx) {
    // this makes us return a message to the client. Maybe that's ok if / when we're streaming the text back as true
    // chunk representations (with index, etc).
    if (ctx.args.input.stopReason) {
        return {
            // differentiating with `<id>#response` for now. But this is no bueno.
            // either the sentinel value needs to be included in the last chunk with content
            // --- or ---
            // we need to represent it in the client message type
            // --- or ---
            // we could potentially just throw an error here, but that's bad.
            id: `${ctx.args.input.associatedUserMessageId}#response`,
            createdAt: ctx.stash.defaultValues.createdAt,
            updatedAt: ctx.stash.defaultValues.updatedAt,
            conversationId: ctx.args.input.conversationId
        };
    }
    return ctx.prev.result;
}

function reduceChunks(events) {
  // we're limited by the AppSync JS runtime as to what we can do here.
  // so the code is uhh... a little creative.
  function sortEvents(a, b) {
    if (a.contentBlockIndex !== b.contentBlockIndex) {
      return a.contentBlockIndex - b.contentBlockIndex;
    }
    return a.contentBlockDeltaIndex - b.contentBlockDeltaIndex;
  }

  // arrow functions and inline `function` declarations are not supported for sort.
  events.sort(sortEvents);

  // Group events by contentBlockIndex
  const groupedEvents = events.reduce(function(acc, event) {
    if (!acc[event.contentBlockIndex]) {
      acc[event.contentBlockIndex] = [];
    }

    if (event.contentBlockText) {
      acc[event.contentBlockIndex].push(event.contentBlockText);
    }

    if (event.contentBlockToolUse) {
      acc[event.contentBlockIndex].push(event.contentBlockToolUse);
    }
    return acc;
  }, {});

  // Concatenate text for each content block
  const content = Object.keys(groupedEvents).map((index) => {
    const contentBlock = groupedEvents[index];
    // toolUse blocks are sent as a single event.
    if (contentBlock.length === 1 && contentBlock[0].toolUseId) {
      return { toolUse: contentBlock[0] };
    }
    // text blocks are chunked so we join them.
    return { text: contentBlock.join('') };
  });

  return content;
}
