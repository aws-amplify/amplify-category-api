import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import fs from 'fs';
import path from 'path';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';

/**
 * Creates a mapping template for reading message history in a conversation.
 *
 * @returns {MappingTemplateProvider} An object containing request and response mapping functions.
 */
export const readHistoryMappingTemplate = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  const resolver = fs.readFileSync(path.join(__dirname, 'message-history-resolver-fn.js.template'), 'utf8');
  const templateName = `Mutation.${config.field.name.value}.message-history.js`;
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};
