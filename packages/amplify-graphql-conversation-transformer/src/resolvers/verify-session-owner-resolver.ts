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
export const verifySessionOwnerMappingTemplate = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  const resolver = fs.readFileSync(path.join(__dirname, 'verify-session-owner-resolver-fn.js'), 'utf8');
  const templateName = `Mutation.${config.field.name.value}.verify-session-owner.js`;
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};
