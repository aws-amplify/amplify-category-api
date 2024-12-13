import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { GenerationConfigurationWithToolConfig, InferenceConfiguration } from '../grapqhl-generation-transformer';
import fs from 'fs';
import path from 'path';
import { getBaseType } from 'graphql-transformer-common';

const packageName = 'amplify-graphql-generation-transformer';
const packageVersion = require('../../package.json').version;

/**
 * Creates the resolver functions for invoking Amazon Bedrock.
 *
 * @param {GenerationConfigurationWithToolConfig} config - The configuration object containing AI model details, tool config, and inference settings.
 * @returns {Object} An object containing request and response resolver functions.
 */
export const createInvokeBedrockResolverFunction = (config: GenerationConfigurationWithToolConfig): MappingTemplateProvider => {
  const { aiModel, toolConfig, inferenceConfiguration, field } = config;
  const AI_MODEL = aiModel;
  const TOOL_CONFIG = JSON.stringify(toolConfig);
  const SYSTEM_PROMPT = JSON.stringify(config.systemPrompt);
  const INFERENCE_CONFIG = getInferenceConfigResolverDefinition(inferenceConfiguration);
  const NON_STRING_RESPONSE_TYPE = (!stringTypedScalarTypes.includes(getBaseType(config.field.type))).toString();
  const PACKAGE_METADATA = `'${packageName}#${packageVersion}'`;

  const resolver = generateResolver('invoke-bedrock-resolver-fn.template.js', {
    AI_MODEL,
    TOOL_CONFIG,
    SYSTEM_PROMPT,
    INFERENCE_CONFIG,
    NON_STRING_RESPONSE_TYPE,
    PACKAGE_METADATA,
  });

  const templateName = `${field.name.value}-invoke-bedrock-fn`;
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};

const generateResolver = (fileName: string, values: Record<string, string>): string => {
  let resolver = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
  Object.entries(values).forEach(([key, value]) => {
    const replaced = resolver.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), value);
    resolver = replaced;
  });
  return resolver;
};

/**
 * Generates the inference configuration string for the resolver definition.
 *
 * @param {InferenceConfiguration | undefined} inferenceConfiguration - The inference configuration object.
 * @returns {string} A string representation of the inference configuration for use in the resolver definition.
 */
const getInferenceConfigResolverDefinition = (inferenceConfiguration?: InferenceConfiguration): string => {
  return inferenceConfiguration && Object.keys(inferenceConfiguration).length > 0
    ? `{ inferenceConfig: ${JSON.stringify(inferenceConfiguration)} }`
    : 'undefined';
};

const stringTypedScalarTypes = ['String', 'ID', 'AWSJSON'];
