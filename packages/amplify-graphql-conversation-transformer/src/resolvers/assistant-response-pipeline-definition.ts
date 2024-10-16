import { toUpper } from 'graphql-transformer-common';
import { ConversationDirectiveConfiguration } from '../conversation-directive-types';
import { createResolverFunctionDefinition, PipelineDefinition, ResolverFunctionDefinition } from './resolver-function-definition';

/**
 * The pipeline definition for the assistant response mutation resolver.
 */
export const assistantResponsePipelineDefinition: PipelineDefinition = {
  requestSlots: [initSlotDefinition(), authSlotDefinition(), verifySessionOwnerSlotDefinition()],
  dataSlot: dataSlotDefinition(),
  responseSlots: [],
  field: (config) => ({ typeName: 'Mutation', fieldName: fieldName(config) }),
};

function initSlotDefinition(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'init',
    fileName: 'init-resolver-fn.template.js',
    templateName: generateTemplateName('init'),
  });
}

function authSlotDefinition(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'auth',
    fileName: 'auth-resolver-fn.template.js',
    templateName: generateTemplateName('auth'),
  });
}

function verifySessionOwnerSlotDefinition(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'verifySessionOwner',
    fileName: 'verify-session-owner-resolver-fn.template.js',
    templateName: generateTemplateName('verify-session-owner'),
    dataSource: (config) => config.dataSources.conversationTable,
    substitutions: () => ({
      CONVERSATION_ID_PARENT: 'ctx.args.input',
    }),
  });
}

function dataSlotDefinition(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'data',
    fileName: 'assistant-mutation-resolver-fn.template.js',
    templateName: generateTemplateName('assistant-response'),
    dataSource: (config) => config.dataSources.lambdaFunction,
    substitutions: (config) => ({
      CONVERSATION_MESSAGE_TYPE_NAME: `ConversationMessage${toUpper(config.field.name.value)}`,
    }),
  });
}

function fieldName(config: ConversationDirectiveConfiguration): string {
  return config.assistantResponseMutation.field.name.value;
}

function generateTemplateName(slotName: string): (config: ConversationDirectiveConfiguration) => string {
  return (config: ConversationDirectiveConfiguration) => `Mutation.${fieldName(config)}.${slotName}.js`;
}
