import { TransformerContextProvider, MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';
import fs from 'fs';
import path from 'path';
import dedent from 'ts-dedent';

/**
 * Creates a mapping template for invoking a Lambda function in the context of a GraphQL conversation.
 *
 * @param {ConversationDirectiveConfiguration} config - The configuration for the conversation directive.
 * @param {TransformerContextProvider} ctx - The transformer context provider.
 * @returns {MappingTemplateProvider} An object containing request and response mapping functions.
 */
export const invokeLambdaMappingTemplate = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  const { TOOL_DEFINITIONS_LINE, TOOLS_CONFIGURATION_LINE } = generateToolLines(config);
  const SELECTION_SET = selectionSet;
  const MODEL_CONFIGURATION_LINE = generateModelConfigurationLine(config);
  const RESPONSE_MUTATION_NAME = config.responseMutationName;
  const RESPONSE_MUTATION_INPUT_TYPE_NAME = config.responseMutationInputTypeName;
  const MESSAGE_MODEL_NAME = config.messageModel.messageModel.name.value;

  const substitutions = {
    TOOL_DEFINITIONS_LINE,
    TOOLS_CONFIGURATION_LINE,
    SELECTION_SET,
    MODEL_CONFIGURATION_LINE,
    RESPONSE_MUTATION_NAME,
    RESPONSE_MUTATION_INPUT_TYPE_NAME,
    MESSAGE_MODEL_NAME,
  };

  let resolver = fs.readFileSync(path.join(__dirname, 'invoke-lambda-resolver-fn.template.js'), 'utf8');
  Object.entries(substitutions).forEach(([key, value]) => {
    const replaced = resolver.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), value);
    resolver = replaced;
  });
  const templateName = `Mutation.${config.field.name.value}.invoke-lambda.js`;

  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};

const generateToolLines = (config: ConversationDirectiveConfiguration) => {
  const toolDefinitions = JSON.stringify(config.toolSpec);
  const TOOL_DEFINITIONS_LINE = toolDefinitions ? `const toolDefinitions = ${toolDefinitions};` : '';

  const TOOLS_CONFIGURATION_LINE = toolDefinitions
    ? dedent`const dataTools = toolDefinitions.tools;
     const toolsConfiguration = {
      dataTools,
      clientTools,
    };`
    : dedent`const toolsConfiguration = {
      clientTools
    };`;

  return { TOOL_DEFINITIONS_LINE, TOOLS_CONFIGURATION_LINE };
};

/**
 * Generates a line of code for the model configuration in the context of a GraphQL conversation.
 *
 * @param {ConversationDirectiveConfiguration} config - The configuration for the conversation directive.
 * @returns {string} A string containing the model configuration line.
 */
const generateModelConfigurationLine = (config: ConversationDirectiveConfiguration) => {
  const { aiModel, systemPrompt } = config;

  return dedent`const modelConfiguration = {
    modelId: '${aiModel}',
    systemPrompt: ${JSON.stringify(systemPrompt)},
    ${generateModelInferenceConfigurationLine(config)}
  };`;
};

/**
 * Generates a line of code for the model inference configuration in the context of a GraphQL conversation.
 *
 * @param {ConversationDirectiveConfiguration} config - The configuration for the conversation directive.
 * @returns {string} A string containing the model inference configuration line.
 */
const generateModelInferenceConfigurationLine = (config: ConversationDirectiveConfiguration) => {
  const { inferenceConfiguration } = config;
  return inferenceConfiguration && Object.keys(inferenceConfiguration).length > 0
    ? dedent`inferenceConfiguration: ${JSON.stringify(config.inferenceConfiguration)},`
    : '';
};

/**
 * The selection set for the conversation message.
 */
const selectionSet = `id conversationId content { image { format source { bytes }} text toolUse { toolUseId name input } toolResult { status toolUseId content { json text image { format source { bytes }} document { format name source { bytes }} }}} role owner createdAt updatedAt`;
