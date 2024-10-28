import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import fs from 'fs';
import path from 'path';
import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import { toUpper } from 'graphql-transformer-common';

/**
 * Creates and returns the mapping template for the assistant mutation resolver.
 * This includes both request and response functions.
 *
 * @returns {MappingTemplateProvider} An object containing request and response MappingTemplateProviders.
 */
export const assistantStreamingMutationReduceChunksResolver = (config: ConversationDirectiveConfiguration): MappingTemplateProvider => {
  let resolver = fs.readFileSync(path.join(__dirname, 'assistant-streaming-mutation-reduce-chunks-resolver-fn.template.js'), 'utf8');
  const fieldName = toUpper(config.field.name.value);
  const substitutions = {
    CONVERSATION_MESSAGE_TYPE_NAME: `ConversationMessage${fieldName}`,
  };
  Object.entries(substitutions).forEach(([key, value]) => {
    const replaced = resolver.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), value);
    resolver = replaced;
  });
  const templateName = `Mutation.${config.field.name.value}.assistant-response-stream-reduce-chunks.js`;
  return MappingTemplate.s3MappingFunctionCodeFromString(resolver, templateName);
};
