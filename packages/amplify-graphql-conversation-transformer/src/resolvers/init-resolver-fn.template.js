export function request(ctx) {
  ctx.stash.graphqlApiEndpoint = '[[GRAPHQL_API_ENDPOINT]]';
  ctx.stash.defaultValues = ctx.stash.defaultValues ?? {};
  ctx.stash.defaultValues.id = util.autoId();
  const createdAt = util.time.nowISO8601();
  ctx.stash.defaultValues.createdAt = createdAt;
  ctx.stash.defaultValues.updatedAt = createdAt;
  return {
    version: '2018-05-09',
    payload: {},
  };
}

export function response(ctx) {
  return {};
}
