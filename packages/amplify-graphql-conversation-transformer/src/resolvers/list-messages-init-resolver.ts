import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import fs from 'fs';
import path from 'path';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';

/**
 * Creates and returns the function code for the list messages resolver init slot.
 *
 * @returns {MappingTemplateProvider}
 */
export const listMessageInitMappingTemplate = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  const resolver = fs.readFileSync(path.join(__dirname, 'list-messages-init-resolver-fn.template.js'), 'utf8');
  const templateName = `Query.${config.field.name.value}.list-messages-init.js`;
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};
