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
  const value = body?.output?.message?.content?.[0]?.toolUse?.input?.value;

  if (!value) {
    util.error('Invalid Bedrock response', 'InvalidResponseException');
  }

  [[NON_STRING_RESPONSE_HANDLING]]
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
