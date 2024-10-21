import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import {
  CONVERSATION_MESSAGE_GET_QUERY_INPUT_TYPE_NAME,
  getConversationMessageGetQueryName,
  getConversationMessageListQueryInputTypeName,
  getConversationMessageListQueryName,
} from '../graphql-types/name-values';
import { createResolverFunctionDefinition, PipelineDefinition, ResolverFunctionDefinition } from './resolver-function-definition';

/**
 * The pipeline definition for the send message mutation resolver.
 */
export const sendMessagePipelineDefinition: PipelineDefinition = {
  requestSlots: [init(), auth(), verifySessionOwner(), writeMessageToTable()],
  dataSlot: invokeLambda(),
  responseSlots: [],
  field: (config) => ({ typeName: 'Mutation', fieldName: config.field.name.value }),
};

/**
 * The init slot for the send message mutation resolver.
 */
function init(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'init',
    fileName: 'init-resolver-fn.template.js',
    templateName: generateTemplateName('init'),
  });
}

/**
 * The auth slot for the send message mutation resolver.
 */
function auth(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'auth',
    fileName: 'auth-resolver-fn.template.js',
    templateName: generateTemplateName('auth'),
  });
}

/**
 * The verify session owner slot for the send message mutation resolver.
 */
function verifySessionOwner(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'verifySessionOwner',
    fileName: 'verify-session-owner-resolver-fn.template.js',
    templateName: generateTemplateName('verify-session-owner'),
    dataSource: (config) => config.dataSources.conversationTableDataSource,
    substitutions: () => ({
      CONVERSATION_ID_PARENT: 'ctx.args',
    }),
  });
}

/**
 * The write message to table slot for the send message mutation resolver.
 */
function writeMessageToTable(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'writeMessageToTable',
    fileName: 'write-message-to-table-resolver-fn.template.js',
    templateName: generateTemplateName('write-message-to-table'),
    dataSource: (config) => config.dataSources.messageTableDataSource,
    substitutions: (config) => ({
      CONVERSATION_MESSAGE_TYPE_NAME: config.message.model.name.value,
    }),
  });
}

/**
 * The data slot for the send message mutation resolver.
 */
function invokeLambda(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'data',
    fileName: 'invoke-lambda-resolver-fn.template.js',
    templateName: generateTemplateName('invoke-lambda'),
    dataSource: (config) => config.dataSources.lambdaFunctionDataSource,
    substitutions: invokeLambdaResolverSubstitutions,
  });
}

/**
 * The substitutions for the invoke lambda resolver function.
 */
function invokeLambdaResolverSubstitutions(config: ConversationDirectiveConfiguration) {
  return {
    MODEL_ID: JSON.stringify(config.aiModel),
    SYSTEM_PROMPT: JSON.stringify(config.systemPrompt),
    DATA_TOOLS: JSON.stringify(config.toolSpec),
    SELECTION_SET: selectionSet,
    INFERENCE_CONFIGURATION: JSON.stringify(config.inferenceConfiguration),
    RESPONSE_MUTATION_NAME: config.assistantResponseMutation.field.name.value,
    RESPONSE_MUTATION_INPUT_TYPE_NAME: config.assistantResponseMutation.input.name.value,
    MESSAGE_MODEL_NAME: config.message.model.name.value,
    GET_QUERY_NAME: getConversationMessageGetQueryName(config),
    GET_QUERY_INPUT_TYPE_NAME: CONVERSATION_MESSAGE_GET_QUERY_INPUT_TYPE_NAME,
    LIST_QUERY_NAME: getConversationMessageListQueryName(config),
    LIST_QUERY_INPUT_TYPE_NAME: getConversationMessageListQueryInputTypeName(config),
    LIST_QUERY_LIMIT: 'undefined',
  };
}

/**
 * The function to generate the template name for the resolver function.
 */
function generateTemplateName(slotName: string) {
  return (config: ConversationDirectiveConfiguration) => `Mutation.${config.field.name.value}.${slotName}.js`;
}

const selectionSet = `id conversationId content { image { format source { bytes }} text toolUse { toolUseId name input } toolResult { status toolUseId content { json text image { format source { bytes }} document { format name source { bytes }} }}} role owner createdAt updatedAt`;
