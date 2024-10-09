import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { args, request } = ctx;
  const { graphqlApiEndpoint } = ctx.stash;

  [[TOOL_DEFINITIONS_LINE]]
  const selectionSet = '[[SELECTION_SET]]';

  const responseMutation = {
    name: '[[RESPONSE_MUTATION_NAME]]',
    inputTypeName: '[[RESPONSE_MUTATION_INPUT_TYPE_NAME]]',
    selectionSet,
  };
  const currentMessageId = ctx.stash.defaultValues.id;
  [[MODEL_CONFIGURATION_LINE]]

  const clientTools = args.toolConfiguration?.tools?.map((tool) => {
    return { ...tool.toolSpec };
  });
  [[TOOLS_CONFIGURATION_LINE]]

  const messageHistoryQuery = {
    getQueryName: '[[GET_QUERY_NAME]]',
    getQueryInputTypeName: '[[GET_QUERY_INPUT_TYPE_NAME]]',
    listQueryName: '[[LIST_QUERY_NAME]]',
    listQueryInputTypeName: '[[LIST_QUERY_INPUT_TYPE_NAME]]',
    listQueryLimit: [[LIST_QUERY_LIMIT]],
  };

  const authHeader = request.headers['authorization'];
  const payload = {
    conversationId: args.conversationId,
    currentMessageId,
    responseMutation,
    graphqlApiEndpoint,
    modelConfiguration,
    request: { headers: { authorization: authHeader } },
    messageHistoryQuery,
    toolsConfiguration,
  };

  return {
    operation: 'Invoke',
    payload,
    invocationType: 'Event',
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.appendError(ctx.error.message, ctx.error.type);
  }
  const response = {
    __typename: '[[MESSAGE_MODEL_NAME]]',
    id: ctx.stash.defaultValues.id,
    conversationId: ctx.args.conversationId,
    role: 'user',
    content: ctx.args.content,
    aiContext: ctx.args.aiContext,
    toolConfiguration: ctx.args.toolConfiguration,
    createdAt: ctx.stash.defaultValues.createdAt,
    updatedAt: ctx.stash.defaultValues.updatedAt,
  };
  return response;
}
