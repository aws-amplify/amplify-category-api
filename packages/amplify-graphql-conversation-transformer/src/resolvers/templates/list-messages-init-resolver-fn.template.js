export function request(ctx) {
  ctx.stash.metadata.index = 'gsi-ConversationMessage.conversationId.createdAt';
  return {};
}

export function response(ctx) {
  return {};
}
