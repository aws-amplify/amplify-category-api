export function request(ctx) {
  var now = util.time.nowISO8601();

  return {
    operation: 'BatchPutItem',
    tables: {
      [ctx.stash.TodoTable]: ctx.args.todos.map((encounter) =>
        util.dynamodb.toMapValues({
          ...encounter,
          id: util.autoId(),
          createdAt: now,
          updatedAt: now,
        }),
      ),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result.data[ctx.stash.Todo];
}
