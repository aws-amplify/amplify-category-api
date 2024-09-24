export function request(ctx) {
  const { conversationId } = ctx.args;
  const { authFilter } = ctx.stash;

  const limit = 100;
  const query = {
    expression: 'conversationId = :conversationId',
    expressionValues: util.dynamodb.toMapValues({
      ':conversationId': ctx.args.conversationId,
    }),
  };

  const filter = JSON.parse(util.transform.toDynamoDBFilterExpression(authFilter));
  const index = 'gsi-ConversationMessage.conversationId.createdAt';

  return {
    operation: 'Query',
    query,
    filter,
    index,
    scanIndexForward: false,
  };
}

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
    }, []);

  const currentMessage = { role: 'user', content: ctx.prev.result.content };
  const items = [...messagesWithAssistantResponse, currentMessage];
  return { items };
}
