import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { dedent } from 'ts-dedent';
import { JSResolverFunctionProvider } from './js-resolver-function-provider';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';

/**
 * Creates and returns the mapping template for the init resolver.
 * This includes both request and response functions.
 *
 * @returns {JSResolverFunctionProvider} An object containing request and response MappingTemplateProviders.
 */
export const listMessageInitMappingTemplate = (): JSResolverFunctionProvider => {
  const req = createListMessageInitRequestFunction();
  const res = createListMessageInitResponseFunction();
  return { req, res };
};

/**
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the request function.
 */

const createListMessageInitRequestFunction = (): MappingTemplateProvider => {
  const requestFunctionString = `
      export function request(ctx) {
        ctx.stash.metadata.index = 'gsi-ConversationMessage.conversationId.createdAt';
        return {};
    }`;

  return MappingTemplate.inlineTemplateFromString(dedent(requestFunctionString));
};

/**
 *
 * @returns {MappingTemplateProvider} A MappingTemplateProvider for the response function.
 */
const createListMessageInitResponseFunction = (): MappingTemplateProvider => {
  const responseFunctionString = `
      export function response(ctx) {
        return {};
    }`;

  return MappingTemplate.inlineTemplateFromString(dedent(responseFunctionString));
};
