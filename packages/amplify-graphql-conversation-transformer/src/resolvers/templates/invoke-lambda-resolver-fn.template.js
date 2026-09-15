import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { args, request } = ctx;
  const { graphqlApiEndpoint } = ctx.stash;
  const userAgent = createUserAgent(request);

  const selectionSet = '[[SELECTION_SET]]';

  const streamingResponseMutation = {
    name: '[[STREAMING_RESPONSE_MUTATION_NAME]]',
    inputTypeName: '[[STREAMING_RESPONSE_MUTATION_INPUT_TYPE_NAME]]',
    selectionSet,
  };

  const currentMessageId = ctx.stash.defaultValues.id;

  const modelConfiguration = {
    modelId: [[MODEL_ID]],
    systemPrompt: [[SYSTEM_PROMPT]],
    inferenceConfiguration: [[INFERENCE_CONFIGURATION]],
  };

  const clientTools = args.toolConfiguration?.tools?.map((tool) => {
    return { ...tool.toolSpec };
  });
  const dataTools = [[DATA_TOOLS]];
  const toolsConfiguration = { dataTools, clientTools };

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
    responseMutation: streamingResponseMutation,
    graphqlApiEndpoint,
    modelConfiguration,
    request: {
      headers: {
        authorization: authHeader,
        'x-amz-user-agent': userAgent,
      }
    },
    messageHistoryQuery,
    toolsConfiguration,
    streamResponse: true,
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

function createUserAgent(request) {
  const packageMetadata = [[PACKAGE_METADATA]];
  let userAgent = request.headers['x-amz-user-agent'];
  if (userAgent) {
    userAgent = `${userAgent} md/${packageMetadata}`;
  } else {
    userAgent = `lib/${packageMetadata}`;
  }
  return userAgent;
}