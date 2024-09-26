import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import fs from 'fs';
import path from 'path';

/**
 * Creates a mapping template for writing a message to a table in a conversation.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const writeMessageToTableMappingTemplate = (fieldName: string): MappingTemplateProvider => {
  const substitutions = {
    CONVERSATION_MESSAGE_TYPE_NAME: `ConversationMessage${fieldName}`,
  };
  let resolver = fs.readFileSync(path.join(__dirname, 'write-message-to-table-resolver-fn.js.template'), 'utf8');
  Object.entries(substitutions).forEach(([key, value]) => {
    const replaced = resolver.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), value);
    resolver = replaced;
  });

  const templateName = `Mutation.${fieldName}.write-message-to-table.js`;
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};
