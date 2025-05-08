import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { args } = ctx;

  const payload = {
    conversationId: args.conversationId,
  };

  return {
    operation: 'Invoke',
    payload,
    // invocationType: 'Event',
  };
}

export function response(ctx) {
  return ctx.result;
}
