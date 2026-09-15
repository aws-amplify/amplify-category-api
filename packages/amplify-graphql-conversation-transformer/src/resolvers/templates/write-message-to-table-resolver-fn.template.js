import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

export function request(ctx) {
  const args = ctx.stash.transformedArgs ?? ctx.args;
  const defaultValues = ctx.stash.defaultValues ?? {};
  const message = {
    __typename: '[[CONVERSATION_MESSAGE_TYPE_NAME]]',
    role: 'user',
    ...args,
    ...defaultValues,
  };
  const id = ctx.stash.defaultValues.id;

  return ddb.put({ key: { id }, item: message });
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  } else {
    return ctx.result;
  }
}
