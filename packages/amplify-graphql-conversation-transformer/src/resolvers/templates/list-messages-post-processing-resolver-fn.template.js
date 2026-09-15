export function request(ctx) {
  return {};
}

export function response(ctx) {
  // Conversation messages are retrieved from DynamoDB in descending order by createdAt.
  // We reverse them here because the most recent messages should be last in the list for clients:
  // We can't use ascending order because we can miss the most recent messages due to limits / pagination.
  const { items, ...rest } = ctx.prev.result;
  const reversed = items.reverse();
  return { items: reversed, ...rest };
}
