import { util } from '@aws-appsync/utils';

export function request(ctx) {
  ctx.stash.metadata.index = '[[INDEX_NAME]]';
  ctx.stash.modelQueryExpression = [[MODEL_QUERY_EXPRESSION]];
  ctx.args.sortDirection = '[[SORT_DIRECTION]]';
  return {};
}

export function response(ctx) {
  return {};
}
