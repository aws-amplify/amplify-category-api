import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const toolConfig = [[TOOL_CONFIG]];
  const prompt = [[SYSTEM_PROMPT]];
  const args = JSON.stringify(ctx.args);
  const inferenceConfig = [[INFERENCE_CONFIG]];
  const userAgent = createUserAgent(ctx.request);

  return {
    resourcePath: '/model/[[AI_MODEL]]/converse',
    method: 'POST',
    params: {
      headers: {
        'Content-Type': 'application/json',
        'x-amz-user-agent': userAgent,
      },
      body: {
        messages: [
          {
            role: 'user',
            content: [{ text: args }],
          },
        ],
        system: [{ text: prompt }],
        toolConfig,
        ...inferenceConfig,
      },
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // Check for AccessDeniedException.
  // This can happen if:
  //   1. The Bedrock model isn't enabled in this region.
  //   2. The IAM policy statement for the role assumed by the data source for this resolver doesn't include them model.
  //    This shouldn't happen because we're managing the policy statements.
  // We're using a generic error description here (as opposed to using the response body)
  // to prevent information about the system from leaking.
  const errorType = ctx.result.headers['x-amzn-ErrorType'];
  if (errorType) {
    if (errorType.startsWith('AccessDeniedException')) {
      const errorMessage = 'The model is disabled or this generation route is missing a necessary identity-based policy.';
      util.error(errorMessage, 'AccessDeniedException');
    }

    util.error('', errorType);
  }

  const body = JSON.parse(ctx.result.body);
  let value = body?.output?.message?.content?.find((content) => !!content.toolUse)?.toolUse?.input?.value;

  if (!value) {
    util.error('Invalid foundation model response', 'InvalidResponseException');
  }

  // The first condition (the boolean literal) in this if statement represents whether the
  // return type of the generation route is a raw string or not.
  // If the return type is `String` / `String!`, the value is `false` and we don't attempt any fallback parsing.
  // If the return type isn't `String` / `String!`, the valie is `true` and the toolUse input is a `string`,
  // the foundation model has returned stringified JSON, so we attempt to parse it into a valid object.
  if ([[NON_STRING_RESPONSE_TYPE]] && typeof value === 'string') {
    return parseIncorrectlyStringifiedJSON(value);
  }

  return value;
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

function parseIncorrectlyStringifiedJSON(input) {
  // Try statements are not supported:
  // `@aws-appsync/no-try: Try statements are not supported`

  // This initial attempt covers the case where the tool input is valid stringified JSON
  let value = JSON.parse(input);
  // A failed parse attempt doesn't throw an error in resolver functions.
  // It returns an empty string, so a truthiness check suffices.
  if (value) return value;

  // Since the tool input wasn't valid stringified JSON, we're assuming that
  // it contains `'` where it should contain `\"`. Some foundation models like to do this.
  // This is our last fallback attempt and covers the cases observed in the wild.

  // Regular expression is not supported in resolver functions:
  // `error @aws-appsync/no-regex: Regex literals are not supported`
  // However, raw string inputs are processed by the underlying Java runtime.
  // So the patterns used are valid Java patterns, and not necessarily valid JavaScript patterns

  // Replaces single quotes with double quotes, handling escaped single quotes.
  value = input
    // Replace any escaped single quotes with a marker.
    .replaceAll("\\\\'", "___ESCAPED_QUOTE___")
    // Replace all remaining single quotes with double quotes
    .replaceAll("'", "\"")
    // Restore escaped single quotes
    .replaceAll("___ESCAPED_QUOTE___", "'");

  value = JSON.parse(value);
  if (value) return value;

  // Nothing more to do, time to bail.
  util.error('Unable to parse foundation model response', 'InvalidResponseException')
}