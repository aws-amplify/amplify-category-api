import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import fs from 'fs';
import path from 'path';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';

/**
 * Creates a mapping template for verifying the session owner in a conversation.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const verifySessionOwnerSendMessageMappingTemplate = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  const substitutions = {
    CONVERSATION_ID_PARENT: 'ctx.args',
  };
  const templateName = `Mutation.${config.field.name.value}.verify-session-owner.js`;
  return verifySessionOwnerMappingTemplate(templateName, substitutions);
};

/**
 * Creates a mapping template for verifying the session owner in a conversation.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const verifySessionOwnerAssistantResponseMappingTemplate = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  const substitutions = {
    CONVERSATION_ID_PARENT: 'ctx.args.input',
  };
  const templateName = `Mutation.${config.field.name.value}AssistantResponse.verify-session-owner.js`;
  return verifySessionOwnerMappingTemplate(templateName, substitutions);
};

const verifySessionOwnerMappingTemplate = (templateName: string, substitute: Record<string, string>) => {
  let resolver = fs.readFileSync(path.join(__dirname, 'verify-session-owner-resolver-fn.template.js'), 'utf8');
  Object.entries(substitute).forEach(([key, value]) => {
    const replaced = resolver.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), value);
    resolver = replaced;
  });

  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};
