export function request(ctx) {
  ctx.stash.metadata.index = '[[INDEX_NAME]]';
  return {};
}

export function response(ctx) {
  return {};
}
