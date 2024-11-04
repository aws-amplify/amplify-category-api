import { util } from '@aws-appsync/utils';

export function request(ctx) {
  ctx.stash.metadata.index = '[[INDEX_NAME]]';
  const conversationId = ctx.args?.filter?.conversationId?.eq;
  if (conversationId) {
    // If a conversationId was provided, we're going to execute a query
    // rather than a scan. The index (gsi) we're performing this query on has
    // a partitionKey of conversationId.
    // We need to remove conversationId from the filter to prevent a
    // DynamoDB exception:
    // `Filter Expression can only contain non-primary key attributes`
    delete ctx.args.filter.conversationId;
    // If conversationId was the only filter, remove the filter object
    // to prevent errors when the `{}` filter is combined with
    // the `authFilter` further downstream.
    if (Object.keys(ctx.args.filter).length === 0) {
        delete ctx.args.filter;
    }
    ctx.stash.modelQueryExpression = {
      expression: '#conversationId = :conversationId',
      expressionNames: {
        '#conversationId': 'conversationId',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':conversationId': conversationId,
      }),
    };
  }
  ctx.args.sortDirection = 'DESC';
  return {};
}

export function response(ctx) {
  return {};
}
