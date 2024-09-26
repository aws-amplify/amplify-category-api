import { util } from '@aws-appsync/utils';

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

  const expression = 'SET #assistantContent = :assistantContent, #updatedAt = :updatedAt';
  const expressionNames = { '#assistantContent': 'assistantContent', '#updatedAt': 'updatedAt' };
  const expressionValues = { ':assistantContent': content, ':updatedAt': updatedAt };
  const condition = JSON.parse(
    util.transform.toDynamoDBConditionExpression({
      owner: { eq: owner },
      conversationId: { eq: conversationId },
    }),
  );
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ id: associatedUserMessageId }),
    condition,
    update: {
      expression,
      expressionNames,
      expressionValues: util.dynamodb.toMapValues(expressionValues),
    },
  };
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

  const { conversationId, content, associatedUserMessageId } = ctx.args.input;
  const { createdAt, updatedAt } = ctx.result;

  return {
    id: associatedUserMessageId,
    content,
    conversationId,
    role: 'assistant',
    owner: ctx.stash.owner,
    createdAt,
    updatedAt,
  };
}
