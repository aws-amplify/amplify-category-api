import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import {
  createResolverFunctionDefinition,
  createS3AssetMappingTemplateGenerator,
  PipelineDefinition,
  ResolverFunctionDefinition,
} from './resolver-function-definition';

/**
 * The pipeline definition for the assistant response mutation resolver.
 */
export const assistantResponsePipelineDefinition: PipelineDefinition = {
  requestSlots: [init(), auth(), verifySessionOwner()],
  dataSlot: data(),
  responseSlots: [],
  field: (config) => ({ typeName: 'Mutation', fieldName: fieldName(config) }),
};

/**
 * The init slot for the assistant response mutation resolver.
 */
function init(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'init',
    fileName: 'init-resolver-fn.template.js',
    generateTemplate: templateGenerator('init'),
  });
}

/**
 * The auth slot for the assistant response mutation resolver.
 */
function auth(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'auth',
    fileName: 'auth-resolver-fn.template.js',
    generateTemplate: templateGenerator('auth'),
  });
}

/**
 * The verify session owner slot for the assistant response mutation resolver.
 */
function verifySessionOwner(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'verifySessionOwner',
    fileName: 'verify-session-owner-resolver-fn.template.js',
    generateTemplate: templateGenerator('verify-session-owner'),
    dataSource: (config) => config.dataSources.conversationTableDataSource,
    substitutions: () => ({
      CONVERSATION_ID_PARENT: 'ctx.args.input',
    }),
  });
}

/**
 * The data slot for the assistant response mutation resolver.
 */
function data(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'data',
    fileName: 'assistant-mutation-resolver-fn.template.js',
    generateTemplate: templateGenerator('assistant-response'),
    dataSource: (config) => config.dataSources.messageTableDataSource,
    substitutions: (config) => ({
      CONVERSATION_MESSAGE_TYPE_NAME: config.message.model.name.value,
    }),
  });
}

/**
 * Field name for the assistant response mutation.
 */
function fieldName(config: ConversationDirectiveConfiguration): string {
  return config.assistantResponseMutation.field.name.value;
}

/**
 * Creates a template generator specific to the assistant response pipeline for a given slot name.
 */
function templateGenerator(slotName: string) {
  return createS3AssetMappingTemplateGenerator('Mutation', slotName, fieldName);
}
