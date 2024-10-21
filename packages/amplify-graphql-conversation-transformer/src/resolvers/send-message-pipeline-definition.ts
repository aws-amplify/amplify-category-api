import { toUpper } from 'graphql-transformer-common';
import pluralize from 'pluralize';
import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
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

function init(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'init',
    fileName: 'init-resolver-fn.template.js',
    templateName: generateTemplateName('init'),
  });
}

function auth(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'auth',
    fileName: 'auth-resolver-fn.template.js',
    templateName: generateTemplateName('auth'),
  });
}

function verifySessionOwner(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'verifySessionOwner',
    fileName: 'verify-session-owner-resolver-fn.template.js',
    templateName: generateTemplateName('verify-session-owner'),
    dataSource: (config) => config.dataSources.conversationTable,
    substitutions: () => ({
      CONVERSATION_ID_PARENT: 'ctx.args',
    }),
  });
}

function writeMessageToTable(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'writeMessageToTable',
    fileName: 'write-message-to-table-resolver-fn.template.js',
    templateName: generateTemplateName('write-message-to-table'),
    dataSource: (config) => config.dataSources.messageTable,
    substitutions: (config) => ({
      CONVERSATION_MESSAGE_TYPE_NAME: config.message.model.name.value,
    }),
  });
}

function invokeLambda(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'data',
    fileName: 'invoke-lambda-resolver-fn.template.js',
    templateName: generateTemplateName('invoke-lambda'),
    dataSource: (config) => config.dataSources.lambdaFunction,
    substitutions: invokeLambdaResolverSubstitutions,
  });
}

function invokeLambdaResolverSubstitutions(config: ConversationDirectiveConfiguration) {
  return {
    DATA_TOOLS: JSON.stringify(config.toolSpec),
    SELECTION_SET: selectionSet,
    INFERENCE_CONFIGURATION: JSON.stringify(config.inferenceConfiguration),
    RESPONSE_MUTATION_NAME: config.assistantResponseMutation.field.name.value,
    RESPONSE_MUTATION_INPUT_TYPE_NAME: config.assistantResponseMutation.input.name.value,
    MESSAGE_MODEL_NAME: config.message.model.name.value,
    GET_QUERY_NAME: `getConversationMessage${toUpper(config.field.name.value)}`,
    GET_QUERY_INPUT_TYPE_NAME: 'ID',
    LIST_QUERY_NAME: `listConversationMessage${toUpper(pluralize(config.field.name.value))}`,
    LIST_QUERY_INPUT_TYPE_NAME: `ModelConversationMessage${toUpper(config.field.name.value)}FilterInput`,
    LIST_QUERY_LIMIT: 'undefined',
  };
}

function generateTemplateName(slotName: string) {
  return (config: ConversationDirectiveConfiguration) => `Mutation.${config.field.name.value}.${slotName}.js`;
}

const selectionSet = `id conversationId content { image { format source { bytes }} text toolUse { toolUseId name input } toolResult { status toolUseId content { json text image { format source { bytes }} document { format name source { bytes }} }}} role owner createdAt updatedAt`;
