import { toUpper } from 'graphql-transformer-common';
import { NO_SUBSTITUTIONS, NONE_DATA_SOURCE, PipelineDefinition, ResolverFunctionDefinition } from './resolver-function-definition';

const initSlotDefinition: ResolverFunctionDefinition = {
  slotName: 'init',
  fileName: 'init-resolver-fn.template.js',
  templateName: (config) => `Mutation.${config.responseMutationName}.init.js`,
  dataSource: NONE_DATA_SOURCE,
  substitutions: NO_SUBSTITUTIONS,
};

const authSlotDefinition: ResolverFunctionDefinition = {
  slotName: 'auth',
  fileName: 'auth-resolver-fn.template.js',
  templateName: (config) => `Mutation.${config.responseMutationName}.auth.js`,
  dataSource: NONE_DATA_SOURCE,
  substitutions: NO_SUBSTITUTIONS,
};

const verifySessionOwnerSlotDefinition: ResolverFunctionDefinition = {
  slotName: 'verifySessionOwner',
  fileName: 'verify-session-owner-resolver-fn.template.js',
  templateName: (config) => `Mutation.${config.responseMutationName}.verify-session-owner.js`,
  dataSource: (config) => config.dataSources.conversationTable,
  substitutions: () => ({
    CONVERSATION_ID_PARENT: 'ctx.args.input',
  }),
};

const assistantMutationDataSlotDefinition: ResolverFunctionDefinition = {
  slotName: 'data',
  fileName: 'assistant-mutation-resolver-fn.template.js',
  templateName: (config) => `Mutation.${config.responseMutationName}.assistant-response.js`,
  dataSource: (config) => config.dataSources.lambdaFunction,
  substitutions: (config) => ({
    CONVERSATION_MESSAGE_TYPE_NAME: `ConversationMessage${toUpper(config.field.name.value)}`,
  }),
};

export const assistantResponsePipelineDefinition: PipelineDefinition = {
  requestSlots: [initSlotDefinition, authSlotDefinition, verifySessionOwnerSlotDefinition],
  dataSlot: assistantMutationDataSlotDefinition,
  responseSlots: [],
  // TODO: use typed 'typeName'
  field: (config) => ({ typeName: 'Mutation', fieldName: config.responseMutationName }),
};
