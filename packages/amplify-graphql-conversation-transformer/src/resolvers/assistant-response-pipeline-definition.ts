import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import { createResolverFunctionDefinition, PipelineDefinition, ResolverFunctionDefinition } from './resolver-function-definition';

/**
 * The pipeline definition for the assistant response mutation resolver.
 */
export const assistantResponsePipelineDefinition: PipelineDefinition = {
  requestSlots: [init(), auth(), verifySessionOwner()],
  dataSlot: data(),
  responseSlots: [],
  field: (config) => ({ typeName: 'Mutation', fieldName: fieldName(config) }),
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
      CONVERSATION_ID_PARENT: 'ctx.args.input',
    }),
  });
}

function data(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'data',
    fileName: 'assistant-mutation-resolver-fn.template.js',
    templateName: generateTemplateName('assistant-response'),
    dataSource: (config) => config.dataSources.lambdaFunction,
    substitutions: (config) => ({
      CONVERSATION_MESSAGE_TYPE_NAME: config.message.model.name.value,
    }),
  });
}

function fieldName(config: ConversationDirectiveConfiguration): string {
  return config.assistantResponseMutation.field.name.value;
}

function generateTemplateName(slotName: string): (config: ConversationDirectiveConfiguration) => string {
  return (config: ConversationDirectiveConfiguration) => `Mutation.${fieldName(config)}.${slotName}.js`;
}
