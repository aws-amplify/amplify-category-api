import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';
import { GenerationDirectiveConfiguration } from '../grapqhl-generation-transformer';
import { getBedrockModelId } from '../utils/bedrock-model-id';

export const invokeBedrockResolver = (
  config: GenerationDirectiveConfiguration,
): { req: MappingTemplateProvider; res: MappingTemplateProvider } => {
  const modelId = getBedrockModelId(config.aiModel);
  const toolConfig = JSON.stringify(config.toolConfig);
  // TODO: can we fake a toolResult instead of using 'text' content block?
  const reqString = `export function request(ctx) {
    const tools = \`${toolConfig}\`;
    const prompt = \`${config.systemPrompt}\`;
    const args = JSON.stringify(ctx.args);
    const toolConfig = JSON.parse(tools);

    return {
      resourcePath: '/model/${modelId}/converse',
      method: 'POST',
      params: {
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          messages: [
          {
            role: 'user',
            content: [
              {
                text: args
              }
            ],
          }
        ],
        system: [{ text: prompt }],
        toolConfig,
      }
    }
  }
}
`;

  const req = MappingTemplate.inlineTemplateFromString(dedent(reqString));

  const resString = `export function response(ctx) {
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
  `;

  const res = MappingTemplate.inlineTemplateFromString(dedent(resString));
  return { req, res };
};
