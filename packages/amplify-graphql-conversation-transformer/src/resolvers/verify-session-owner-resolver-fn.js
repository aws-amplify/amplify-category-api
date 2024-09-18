export function request(ctx) {
  const { authFilter } = ctx.stash;

  const query = {
    expression: 'id = :id',
    expressionValues: util.dynamodb.toMapValues({
      ':id': ctx.args.conversationId
    })
  };

  const filter = JSON.parse(util.transform.toDynamoDBFilterExpression(authFilter));

  return {
    operation: 'Query',
    query,
    filter
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  if (ctx.result.items.length !== 0) {
    return ctx.result.items[0];
  }

  util.error('Conversation not found', 'ResourceNotFound');
}