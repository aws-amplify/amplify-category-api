import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import fs from 'fs';
import path from 'path';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';

/**
 * Creates and returns the mapping template for the conversation message subscription resolver.
 * This includes both request and response functions.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const conversationMessageSubscriptionMappingTamplate = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  const resolver = fs.readFileSync(path.join(__dirname, 'assistant-messages-subscription-resolver-fn.template.js'), 'utf8');
  const templateName = `Subscription.${config.field.name.value}.assistant-message.js`;
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};
