import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import {
  createResolverFunctionDefinition,
  createS3AssetMappingTemplateGenerator,
  PipelineDefinition,
  ResolverFunctionDefinition,
} from './resolver-function-definition';

/**
 * The pipeline definition for the assistant response stream mutation resolver.
 */
export const assistantResponseStreamPipelineDefinition: PipelineDefinition = {
  requestSlots: [init(), auth(), verifySessionOwner()],
  dataSlot: data(),
  responseSlots: [reduceChunks()],
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
    fileName: 'assistant-streaming-mutation-resolver-fn.template.js',
    generateTemplate: templateGenerator('assistant-streaming-subscription'),
    dataSource: (config) => config.dataSources.messageTableDataSource,
    substitutions: (config) => ({
      CONVERSATION_MESSAGE_TYPE_NAME: `ConversationMessage${config.field.name.value}`,
    }),
  });
}

function reduceChunks(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'reduceChunks',
    fileName: 'assistant-streaming-mutation-reduce-chunks-resolver-fn.template.js',
    generateTemplate: templateGenerator('reduce-chunks'),
    dataSource: (config) => config.dataSources.messageTableDataSource,
    substitutions: (config) => ({
      CONVERSATION_MESSAGE_TYPE_NAME: `ConversationMessage${config.field.name.value}`,
    }),
  });
}

/**
 * Field name for the assistant response mutation.
 */
function fieldName(config: ConversationDirectiveConfiguration): string {
  return config.assistantResponseStreamingMutation.field.name.value;
}

/**
 * Creates a template generator specific to the assistant response pipeline for a given slot name.
 */
function templateGenerator(slotName: string) {
  return createS3AssetMappingTemplateGenerator('Mutation', slotName, fieldName);
}