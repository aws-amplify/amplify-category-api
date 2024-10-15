import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';
import { toUpper } from 'graphql-transformer-common';
import pluralize from 'pluralize';
import dedent from 'ts-dedent';
import { PipelineSlotDefinition, PipelineDefinition } from './conversation-pipeline-resolver';

const NONE_DATA_SOURCE = () => undefined;
const NO_SUBSTITUTIONS = () => ({});

const initSlotDefinition: PipelineSlotDefinition = {
  slotName: 'init',
  fileName: 'init-resolver-fn.template.js',
  templateName: (config) => `Mutation.${config.field.name.value}.init.js`,
  dataSource: NONE_DATA_SOURCE,
  substitutions: NO_SUBSTITUTIONS,
};

const authSlotDefinition: PipelineSlotDefinition = {
  slotName: 'auth',
  fileName: 'auth-resolver-fn.template.js',
  templateName: (config) => `Mutation.${config.field.name.value}.auth.js`,
  dataSource: NONE_DATA_SOURCE,
  substitutions: NO_SUBSTITUTIONS,
};

const verifySessionOwnerSlotDefinition: PipelineSlotDefinition = {
  slotName: 'verifySessionOwner',
  fileName: 'verify-session-owner-resolver-fn.template.js',
  templateName: (config) => `Mutation.${config.field.name.value}.verify-session-owner.js`,
  dataSource: (config) => config.dataSources.conversationTable,
  substitutions: () => ({
    CONVERSATION_ID_PARENT: 'ctx.args',
  }),
};

const writeMessageToTableSlotDefinition: PipelineSlotDefinition = {
  slotName: 'writeMessageToTable',
  fileName: 'write-message-to-table-resolver-fn.template.js',
  templateName: (config) => `Mutation.${config.field.name.value}.write-message-to-table.js`,
  dataSource: (config) => config.dataSources.messageTable,
  substitutions: (config) => ({
    CONVERSATION_MESSAGE_TYPE_NAME: `ConversationMessage${toUpper(config.field.name.value)}`,
  }),
};

const invokeLambdaResolverSubstitutions = (config: ConversationDirectiveConfiguration) => {
  const { TOOL_DEFINITIONS_LINE, TOOLS_CONFIGURATION_LINE } = generateToolLines(config);
  return {
    TOOL_DEFINITIONS_LINE,
    TOOLS_CONFIGURATION_LINE,
    SELECTION_SET: selectionSet,
    MODEL_CONFIGURATION_LINE: generateModelConfigurationLine(config),
    RESPONSE_MUTATION_NAME: config.responseMutationName,
    RESPONSE_MUTATION_INPUT_TYPE_NAME: config.responseMutationInputTypeName,
    MESSAGE_MODEL_NAME: config.messageModel.messageModel.name.value,
    GET_QUERY_NAME: `getConversationMessage${toUpper(config.field.name.value)}`,
    GET_QUERY_INPUT_TYPE_NAME: 'ID',
    LIST_QUERY_NAME: `listConversationMessage${toUpper(pluralize(config.field.name.value))}`,
    LIST_QUERY_INPUT_TYPE_NAME: `ModelConversationMessage${toUpper(config.field.name.value)}FilterInput`,
    LIST_QUERY_LIMIT: 'undefined',
  };
};

const generateModelConfigurationLine = (config: ConversationDirectiveConfiguration) => {
  const { aiModel, systemPrompt } = config;

  return dedent`const modelConfiguration = {
    modelId: '${aiModel}',
    systemPrompt: ${JSON.stringify(systemPrompt)},
    ${generateModelInferenceConfigurationLine(config)}
  };`;
};

const generateModelInferenceConfigurationLine = (config: ConversationDirectiveConfiguration) => {
  const { inferenceConfiguration } = config;
  return inferenceConfiguration && Object.keys(inferenceConfiguration).length > 0
    ? dedent`inferenceConfiguration: ${JSON.stringify(config.inferenceConfiguration)},`
    : '';
};

const selectionSet = `id conversationId content { image { format source { bytes }} text toolUse { toolUseId name input } toolResult { status toolUseId content { json text image { format source { bytes }} document { format name source { bytes }} }}} role owner createdAt updatedAt`;

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

const invokeLambdaSlotDefinition: PipelineSlotDefinition = {
  slotName: 'data',
  fileName: 'invoke-lambda-resolver-fn.template.js',
  templateName: (config) => `Mutation.${config.field.name.value}.invoke-lambda.js`,
  dataSource: (config) => config.dataSources.lambdaFunction,
  substitutions: invokeLambdaResolverSubstitutions,
};

export const sendMessagePipelineDefinition: PipelineDefinition = {
  requestSlots: [initSlotDefinition, authSlotDefinition, verifySessionOwnerSlotDefinition, writeMessageToTableSlotDefinition],
  dataSlot: invokeLambdaSlotDefinition,
  responseSlots: [],
  field: (config) => ({ typeName: 'Mutation', fieldName: config.field.name.value }),
};
