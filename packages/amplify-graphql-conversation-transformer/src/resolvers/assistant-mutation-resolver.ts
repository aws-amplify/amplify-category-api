import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import fs from 'fs';
import path from 'path';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';
import { toUpper } from 'graphql-transformer-common';

/**
 * Creates and returns the mapping template for the assistant mutation resolver.
 * This includes both request and response functions.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const assistantMutationResolver = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  const resolver = fs.readFileSync(path.join(__dirname, 'assistant-mutation-resolver-fn.js'), 'utf8');
  const templateName = `Mutation.${config.field.name.value}.assistant-response.js`;
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};
