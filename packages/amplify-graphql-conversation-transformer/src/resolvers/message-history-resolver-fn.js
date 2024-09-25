export function request(ctx) {
  const { conversationId } = ctx.args;
  const { authFilter } = ctx.stash;

  const limit = 100;
  const query = {
    expression: 'conversationId = :conversationId',
    expressionValues: util.dynamodb.toMapValues({
      ':conversationId': conversationId,
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
      const { content, assistantContent, aiContext } = current;
      const userContent = aiContext
        ? [...content, { text: JSON.stringify(aiContext) }]
        : content;

      acc.push({ role: 'user', content: userContent });
      acc.push({ role: 'assistant', content: assistantContent });
      return acc;
    }, []);

  const { content, aiContext } = ctx.prev.result;
  const currentUserMessageContent = aiContext
    ? [...content, { text: JSON.stringify(aiContext) }]
    : content;
  const currentMessage = { role: 'user', content: currentUserMessageContent };
  const items = [...messagesWithAssistantResponse, currentMessage];
  return { items };
}
