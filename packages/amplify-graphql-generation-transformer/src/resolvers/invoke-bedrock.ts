import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';
import { GenerationConfigurationWithToolConfig, InferenceConfiguration } from '../grapqhl-generation-transformer';

/**
 * Creates the resolver functions for invoking Amazon Bedrock.
 *
 * @param {GenerationConfigurationWithToolConfig} config - The configuration object containing AI model details, tool config, and inference settings.
 * @returns {Object} An object containing request and response resolver functions.
 */

export const createInvokeBedrockResolverFunction = (config: GenerationConfigurationWithToolConfig): MappingTemplateProvider => {
  const req = createInvokeBedrockRequestFunction(config);
  const res = createInvokeBedrockResponseFunction();
  return MappingTemplate.inlineTemplateFromString(dedent(req + '\n' + res));
};

/**
 * Creates the request function for the Bedrock resolver.
 *
 * @param {GenerationConfigurationWithToolConfig} config - The configuration object for the resolver.
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the request function.
 */
const createInvokeBedrockRequestFunction = (config: GenerationConfigurationWithToolConfig): string => {
  const { aiModel, toolConfig, inferenceConfiguration } = config;
  const stringifiedToolConfig = JSON.stringify(toolConfig);
  const stringifiedSystemPrompt = JSON.stringify(config.systemPrompt);
  // TODO: add stopReason: max_tokens error handling
  const inferenceConfig = getInferenceConfigResolverDefinition(inferenceConfiguration);
  const requestFunctionString = `
  export function request(ctx) {
    const toolConfig = ${stringifiedToolConfig};
    const prompt = ${stringifiedSystemPrompt};
    const args = JSON.stringify(ctx.args);

    return {
      resourcePath: '/model/${aiModel}/converse',
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
          ${inferenceConfig}
        }
      }
    }
  }`;

  return requestFunctionString;
};

/**
 * Creates the response function for the Bedrock resolver.
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the response function.
 */
const createInvokeBedrockResponseFunction = (): string => {
  // TODO: add stopReason: max_tokens error handling
  const responseFunctionString = `
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
    if (typeof response === 'string') {
      return JSON.parse(response);
    }

    return response;
  }
`;

  return responseFunctionString;
};

/**
 * Generates the inference configuration string for the resolver definition.
 *
 * @param {InferenceConfiguration | undefined} inferenceConfiguration - The inference configuration object.
 * @returns {string} A string representation of the inference configuration for use in the resolver definition.
 */
const getInferenceConfigResolverDefinition = (inferenceConfiguration?: InferenceConfiguration): string => {
  return inferenceConfiguration && Object.keys(inferenceConfiguration).length > 0
    ? `inferenceConfig: ${JSON.stringify(inferenceConfiguration)},`
    : '// default inference config';
};
