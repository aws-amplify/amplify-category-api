import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import {
  createResolverFunctionDefinition,
  createS3AssetMappingTemplateGenerator,
  PipelineDefinition,
  ResolverFunctionDefinition,
} from './resolver-function-definition';

/**
 * The pipeline definition for the get attachment url query resolver.
 */
export const getAttachmentUrlPipelineDefinition: PipelineDefinition = {
  requestSlots: [init(), auth(), verifySessionOwner()],
  dataSlot: invokeLambda(),
  responseSlots: [],
  field: (config) => ({ typeName: 'Query', fieldName: fieldName(config) }),
};

/**
 * The init slot for the send message mutation resolver.
 * Note: The init slot references the GraphQL API endpoint, which necessitates the usage of an inline template
 * because CDK cannot substitute the  Fn:GetAtt:GraphQLUrl in S3 Asset based resolver functions.
 */
function init(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'init',
    fileName: 'init-resolver-fn.template.js',
    generateTemplate: (_, code) => MappingTemplate.inlineTemplateFromString(code),
    substitutions: (_, ctx) => ({
      GRAPHQL_API_ENDPOINT: ctx.api.graphqlUrl,
    }),
  });
}

/**
 * The auth slot for the send message mutation resolver.
 */
function auth(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'auth',
    fileName: 'auth-resolver-fn.template.js',
    generateTemplate: templateGenerator('auth'),
  });
}

/**
 * The verify session owner slot for the send message mutation resolver.
 */
function verifySessionOwner(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'verifySessionOwner',
    fileName: 'set-updated-at-conversation-table-fn.template.js',
    generateTemplate: templateGenerator('verify-session-owner'),
    dataSource: (config) => config.dataSources.conversationTableDataSource,
    substitutions: () => ({
      CONVERSATION_ID_PARENT: 'ctx.args.input',
    }),
  });
}

/**
 * The data slot for the send message mutation resolver.
 */
function invokeLambda(): ResolverFunctionDefinition {
  return createResolverFunctionDefinition({
    slotName: 'data',
    fileName: 'invoke-attachment-lambda-resolver-fn.template.js',
    generateTemplate: templateGenerator('invoke-lambda'),
    dataSource: (config) => config.dataSources.attachmentLambdaFunctionDataSource,
  });
}


/**
 * Field name for the send message mutation.
 */
function fieldName(config: ConversationDirectiveConfiguration): string {
  return config.attachmentUploadUrlQuery.field.name.value;
}

/**
 * Creates a template generator specific to the send message pipeline for a given slot name.
 */
function templateGenerator(slotName: string) {
  return createS3AssetMappingTemplateGenerator('Query', slotName, fieldName);
}
