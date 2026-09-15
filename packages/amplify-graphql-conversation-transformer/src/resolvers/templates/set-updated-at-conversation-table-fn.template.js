import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { authFilter } = ctx.stash;
  const { conversationId } = [[CONVERSATION_ID_PARENT]];

  const filter = JSON.parse(util.transform.toDynamoDBFilterExpression(authFilter));

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ id: conversationId }),
    update: {
      expression: 'SET #updatedAt = :updatedAt',
      expressionValues: util.dynamodb.toMapValues({
        ':updatedAt': ctx.stash.defaultValues.createdAt,
      }),
      expressionNames: {
        '#updatedAt': 'updatedAt',
      },
    },
    condition: filter
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error('Conversation not found', 'ResourceNotFound');
  }

  return ctx.result;
}
