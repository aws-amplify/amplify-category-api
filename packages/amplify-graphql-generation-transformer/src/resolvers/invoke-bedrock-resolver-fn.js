export function request(ctx) {
  const toolConfig = [[TOOL_CONFIG]];
  const prompt = [[SYSTEM_PROMPT]];
  const args = JSON.stringify(ctx.args);
  const inferenceConfig = [[INFERENCE_CONFIG]];

  return {
    resourcePath: '/model/[[AI_MODEL]]/converse',
    method: 'POST',
    params: {
      headers: { 'Content-Type': 'application/json' },
      body: {
        messages: [{
          role: 'user',
          content: [{ text: args }],
        }],
        system: [{ text: prompt }],
        toolConfig,
        ...inferenceConfig,
      }
    }
  }
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  const body = JSON.parse(ctx.result.body);
  const { content } = body.output.message;

  if (content.length < 1) {
    util.error('No content block in assistant response.', 'error');
  }

  const toolUse = content[0].toolUse;
  if (!toolUse) {
    util.error('Missing tool use block in assistant response.', 'error');
  }

  const response = toolUse.input.value;
  return response;
}