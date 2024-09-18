import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { args, request, prev } = ctx;
  TOOL_DEFINITIONS_LINE
  const selectionSet = 'SELECTION_SET';
  const graphqlApiEndpoint = 'GRAPHQL_API_ENDPOINT';

  const messages = prev.result.items;
  const responseMutation = {
    name: 'RESPONSE_MUTATION_NAME',
    inputTypeName: 'RESPONSE_MUTATION_INPUT_TYPE_NAME',
    selectionSet,
  };
  const currentMessageId = ctx.stash.defaultValues.id;
  MODEL_CONFIGURATION_LINE

  const clientTools = args.toolConfiguration?.tools?.map((tool) => { return { ...tool.toolSpec }});
  TOOLS_CONFIGURATION_LINE

  const authHeader = request.headers['authorization'];
  const payload = {
    conversationId: args.conversationId,
    currentMessageId,
    responseMutation,
    graphqlApiEndpoint,
    modelConfiguration,
    request: { headers: { authorization: authHeader }},
    messages,
    toolsConfiguration,
  };

  return {
    operation: 'Invoke',
    payload,
    invocationType: 'Event'
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.appendError(ctx.error.message, ctx.error.type);
  }
  const response = {
      __typename: 'MESSAGE_MODEL_NAME',
      id: ctx.stash.defaultValues.id,
      conversationId: ctx.args.conversationId,
      role: 'user',
      content: ctx.args.content,
      createdAt: ctx.stash.defaultValues.createdAt,
      updatedAt: ctx.stash.defaultValues.updatedAt,
  };
  return response;
}