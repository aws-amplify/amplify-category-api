import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import fs from 'fs';
import path from 'path';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';

/**
 * Creates and returns the mapping template for the init resolver.
 * This includes both request and response functions.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const initMappingTemplate = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  const resolver = fs.readFileSync(path.join(__dirname, 'init-resolver-fn.js.template'), 'utf8');
  const templateName = `Mutation.${config.field.name.value}.init.js`;
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};
